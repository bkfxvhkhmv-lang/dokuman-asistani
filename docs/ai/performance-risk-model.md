# BriefPilot Performance Risk Model — High Document Counts

> Scope: client-side React Native / Expo app, focused on 50 / 250 / 1 000+ documents on mid-range and older Android devices.  
> Status: read-only discovery. No code changes.  
> Repo: `/Users/bayramgul/briefpilot-clean` @ `5d6bed5a7`

---

## 1. Executive Summary

The app currently loads **all documents into one React Context + useReducer store** and keeps the full `Dokument[]` array in memory. Most screens derive their UI by re-scanning this array on every render. At low document counts this is fast enough, but it creates predictable nonlinear slowdowns as the library grows.

The biggest risks at scale are:

1. **O(n²) / repeated full-array scans** on Home, Detail, Search and suggestions.
2. **Synchronous, render-time text processing** over `rohText` and other long strings.
3. **Always-on JS-thread animations** that leave no headroom for gestures.
4. **No virtualization / windowing** for lists and document page previews.
5. **Unbounded storage growth** from `rohText`, page images, PDFs and optimistic cards.

The three “quick-win” fixes already identified for a first PR (`DetailsPanel` memoization, `HeroCard` derived values, `useDetailMoreItems` NK scan reduction) address symptom #2. They are safe, but they will only **delay** the scaling cliff; they do not remove the underlying O(n) or O(n²) patterns.

---

## 2. Scale & Device Assumptions

| Tier | Document count | Representative device | Memory pressure | JS thread budget |
|------|----------------|-----------------------|-----------------|------------------|
| A — Current comfort zone | ≤ 50 | Mid-range Android (4 GB RAM, Snapdragon 6xx) | Low | ~8–16 ms/frame |
| B — Noticeable friction | 50–250 | Same mid-range device after 1–2 years | Medium | ~4–8 ms/frame |
| C — Predictable degradation | 250–1 000 | Older Android (3 GB RAM, Snapdragon 4xx) | High | ~2–4 ms/frame |
| D — Broken experience | 1 000+ | Low-end / memory-constrained devices | Critical | < 2 ms/frame, GC pauses |

Assumptions per document:
- Average metadata object: ~3–8 KB (incl. `rohText`, `extrahierteFelder`, pages array).
- Average stored PDF / image set: 1–3 MB.
- Average multi-page scan: 3–8 pages.

At 1 000 docs the in-memory metadata alone can reach **30–80 MB** before images/PDFs are loaded. On a 3 GB RAM device this pushes the app close to the Android low-memory killer threshold.

---

## 3. Risk Areas

### 3.1 Home List & Dashboard (`src/features/home/`)

**Current pattern**
- `useHomeData` derives ~10 filtered sub-lists (`dringend`, `aufgaben`, `sichtbareDocs`, `kalDocs`, `naechste`, etc.) with `useMemo` over the full `Dokument[]` array.
- `HomeRecentList` renders every document in the selected tab with `FlatList`, but no explicit `windowSize` / `initialNumToRender` tuning.
- `Home` rebuilds `budget`, `hotDocs`, `targets`, `reviewDocs`, `homeSuggestions` and `timelineView` on top of the same array every time the store changes.
- Scroll handler runs on every 16 ms scroll event and mutates shared tab-bar visibility state (`src/features/home/index.tsx:130-152`).

**Scalability risk**

| Docs | Cost drivers | Likely UX impact |
|------|--------------|------------------|
| 50 | Derivation is cheap. | Smooth. |
| 250 | Filtering + sorting + timeline scan O(n log n) becomes visible on every store update. | Jank when marking a doc done, slight delay opening Home. |
| 1 000 | Multiple full-array derivations + un-windowed list + budget engine re-run. | Home takes > 1 s to render; scroll drops frames; tab bar lags behind finger. |

**Specific code references**
- `src/features/home/hooks/useHomeData.ts` — derives all sub-lists from full array.
- `src/features/home/index.tsx:55-79` — budget, hotDocs, targets, suggestions, timeline computed on every dependency change.
- `src/features/home/index.tsx:156-164` — scroll event throttle 16 ms, `useNativeDriver: false`.
- `src/features/home/components/HomeRecentList.tsx` — predictive prefetch runs for top 3 docs on every `sichtbareDocs` change.

---

### 3.2 Detail Screen (`src/features/detail/`)

**Current pattern**
- `useDetailBildschirmLogic` looks up the document by `id` in the full store and auto-switches tabs via an effect.
- `HeroCard`, `DetailsPanel`, `RiskPanel`, `DetailAnalysisTab`, `OzetTab` and `AehnlicheDocsSection` each re-derive display values, field groups, risk text and peer comparisons from the document and the **full document array**.
- `useDetailMoreItems` builds a searchable string that concatenates `dok.rohText` and runs a regex over it on every render.
- `DocumentPagesViewer` verifies every page file with `FileSystem.getInfoAsync` in a sequential loop when opening.
- `useDetailScreenAnimations` keeps Animated values alive for the whole screen lifetime.

**Scalability risk**

| Docs | Cost drivers | Likely UX impact |
|------|--------------|------------------|
| 50 | `groupDocumentFields` and title resolution are fast. | Smooth. |
| 250 | `rohText` regex in `useDetailMoreItems`, peer-comparison scan over 250 docs. | ~100–300 ms JS freeze opening a detail; buttons feel “mushy”. |
| 1 000 | Repeated full-array scans for related docs + sequential file existence checks on multi-page docs. | Detail screen can take > 1 s to become interactive; swipe between tabs drops frames. |

**Specific code references**
- `src/features/detail/hooks/useDetailMoreItems.ts:12-19` — `rohText` regex scan.
- `src/features/detail/components/DetailsPanel.tsx` — `groupDocumentFields(dok, extrahierteFelder)` on every render.
- `src/features/detail/components/HeroCard.tsx` — title/sender resolved inline multiple times.
- `src/features/detail/components/DocumentPagesViewer.tsx` — sequential `getInfoAsync` for every page.
- `src/services/smart-risk-engine/peerComparison.ts:8` — `alleDocs.filter(...)` for peer comparison.
- `src/services/smart-timeline/documentTimeline.ts` — builds timeline from full `alleDocs`.

---

### 3.3 Storage & Data Loading (`src/services/storage/`, `src/store/`)

**Current pattern**
- `AsyncStorage` persists a JSON-serialized copy of the entire document array (plus settings, budgets, etc.).
- `BackgroundSyncEngine` loads **all** local documents and **all** remote documents on every 5-minute tick, then does an O(n²) conflict merge.
- `CloudMetadataStore.loadAll()` fetches the complete library in one request.
- `rohText`, `extrahierteFelder`, pages and metadata travel together; there is no separation between “summary” and “heavy body”.

**Scalability risk**

| Docs | Cost drivers | Likely UX impact |
|------|--------------|------------------|
| 50 | AsyncStorage read < 100 ms. | Smooth. |
| 250 | JSON parse/stringify of 2–4 MB blocks on every persistence tick. | App-launch stalls; persist after edits takes 200–500 ms. |
| 1 000 | 10–30 MB JSON parse + full upload/download diff every 5 min. | Launch can take 3–6 s; sync drains battery; ANR risk on low-end devices. |

**Specific code references**
- `src/services/storage/AsyncStorage.ts` / `src/store/persistence.ts` — full-array JSON persistence.
- `src/services/storage/BackgroundSyncEngine.ts:97-147` — full local + remote load + pairwise conflict check.
- `src/services/storage/CloudMetadataStore.ts:87-90` — `loadAll()` returns entire library.

---

### 3.4 PDF / Image Previews (`src/features/detail/components/DocumentPagesViewer.tsx`, scan flow)

**Current pattern**
- Every page URI is validated synchronously-ish (sequential async loop) before rendering.
- No lazy/page-at-a-time loading; all page thumbnails are rendered when the viewer mounts.
- Camera / scan flow stores full-resolution page images and generates PDFs on device.
- Share-extension copies files into app storage.

**Scalability risk**

| Docs / pages | Cost drivers | Likely UX impact |
|--------------|--------------|------------------|
| 50 / ~200 pages | Total local storage ~200–400 MB. | Smooth. |
| 250 / ~1 000 pages | Storage ~1–2 GB; page list renders all items. | Detail image viewer slow to open; storage warnings. |
| 1 000 / ~5 000 pages | Storage ~5–10 GB; no thumbnails/down-sampling. | Viewer crashes or OOMs; gallery scroll unusable; phone runs out of storage. |

**Specific code references**
- `src/features/detail/components/DocumentPagesViewer.tsx` — sequential `getInfoAsync` loop and full page list.
- Scan flow in `src/features/scan/` and `src/modules/scanner/` — stores full-resolution images.

---

### 3.5 Background Work

**Current pattern**
- `BackgroundSyncEngine` runs a 5-minute `setInterval` regardless of app state or network quality.
- `useOcrMvpJob` / `v4DocumentJobPoll` polls backend jobs with `setInterval`/`setTimeout` during capture.
- `HomeRecentList` prefetch fires `setTimeout` on every list change.
- Several UI components run `Animated.loop` for their entire lifetime (Scan tab icon, optimistic cards, OCR status card).
- Daily digest notification iterates all documents to build summary text.

**Scalability risk**

| Docs | Cost drivers | Likely UX impact |
|------|--------------|------------------|
| 50 | Background loops cheap. | Smooth, minor battery impact. |
| 250 | Sync + digest + suggestions all scan full array in background. | Battery drain; periodic UI stalls when loops coincide. |
| 1 000 | Background sync O(n²), notification digest O(n), always-on animations. | Phone heats up; JS thread starved; “overheating laptop” feel. |

**Specific code references**
- `src/services/storage/BackgroundSyncEngine.ts:33-44` — 5 min interval, immediate sync on start.
- `src/services/v4DocumentJobPoll.ts` — polling loop.
- `src/services/smart-summary/kernPunkte.ts`, `kurzSatz.ts` — used for notifications/digest.
- `src/navigation/mainTabsConfig.tsx` — infinite pulse loop on Scan tab icon.
- `src/components/OptimisticDokumentKarte.tsx` — multiple concurrent infinite animations.
- `src/features/ocr-mvp/components/OcrMvpStatusCard.tsx` — continuous shimmer/progress animations.

---

## 4. Cross-Cutting Algorithmic Risks

| Pattern | Where it appears | Complexity | Impact at 1 000 docs |
|---------|------------------|------------|----------------------|
| Full-array filter for related docs | Peer comparison, timeline, suggestions, smart search | O(n) to O(n²) | 1–5 ms → 100–500 ms |
| `rohText` concatenation + regex | `useDetailMoreItems`, search scoring | O(L) per render | Locks JS thread on long scans |
| JSON parse/stringify whole store | Persistence, sync | O(n) | 3–6 s launch stalls |
| Re-derive display values in render | `HeroCard`, `DetailsPanel`, `RiskPanel` | O(1)–O(k) | Death by a thousand cuts |
| Always-on `Animated.loop` | Tab icon, optimistic cards, OCR card | constant CPU | Leaves no gesture headroom |
| Un-windowed lists | Home list, document page viewer | O(n) render | Frame drops, memory spikes |

---

## 5. Risk Matrix (Likelihood × Impact)

| Risk | Likelihood | Impact at 1 000 docs | Priority |
|------|------------|----------------------|----------|
| Home list jank from un-windowed list + repeated derivations | High | High | P0 |
| Detail screen freezes from `rohText`/full-array scans | High | High | P0 |
| AsyncStorage JSON serialization bottleneck | High | High | P0 |
| Background sync O(n²) battery / ANR | Medium | High | P1 |
| PDF/image preview OOM / storage exhaustion | Medium | High | P1 |
| Always-on animations starving JS thread | High | Medium | P1 |
| Daily digest / notification generation scanning all docs | Medium | Medium | P2 |
| Search / smart search regex over `rohText` | Medium | Medium | P2 |

---

## 6. Mitigation Roadmap

### 6.1 First PR — Safe quick wins (already identified)
- `DetailsPanel`: wrap `groupDocumentFields` in `useMemo`.
- `HeroCard`: memoize `displayTitle` / `sender` once per render.
- `useDetailMoreItems`: remove `rohText` from NK search string; rely on metadata fields.

**Expected effect:** pushes the “mushy buttons” problem from ~100 docs to ~250 docs. Does not fix scaling.

### 6.2 Second PR — Structural fixes
1. **Virtualize lists**
   - Add `windowSize={3–5}`, `initialNumToRender={8}`, `maxToRenderPerBatch={5}` to Home `FlatList`.
   - Lazy-load `DocumentPagesViewer` pages; only render visible pages + 1 buffer.

2. **Derive once, share everywhere**
   - Move `dringend`, `aufgaben`, `sichtbareDocs`, `naechste`, `hotDocs`, `budget` derivation into the store selector layer or a single `useMemo` in `useHomeData` and pass derived subsets down.
   - Stop recomputing peer comparison / timeline / suggestions on every Detail render; compute in store or on demand.

3. **Throttle / debounce background work**
   - Pause `BackgroundSyncEngine` when app is backgrounded; back off on error; skip if library unchanged.
   - Add a content-hash / `updatedAt` check before running full sync.

4. **Stop always-on animations**
   - Replace `Animated.loop` tab icon with a static icon or `useNativeDriver` native pulse.
   - Freeze optimistic-card animations when off-screen.

### 6.3 Third PR — Storage & memory architecture
1. **Split metadata from heavy body**
   - Keep a light `DokumentHeader` (id, typ, titel, datum, frist, risiko, erledigt) in memory/store.
   - Persist `rohText`, `extrahierteFelder`, pages in separate keys/files and load on demand.

2. **Paged / cursor-based sync**
   - Replace `loadAll()` with chunked or delta sync (last sync timestamp / cursor).

3. **Image / PDF housekeeping**
   - Down-sample thumbnails; store only thumbnails in metadata; keep full images in cache with LRU eviction.
   - Add an in-app storage cap + cleanup prompt.

4. **Consider SQLite / WatermelonDB**
   - For libraries > 500 docs, `AsyncStorage` JSON becomes the wrong tool. A queryable local DB lets the app avoid loading everything into RAM.

---

## 7. Measurement Suggestions

To make the risk model concrete, add these probes (non-invasive, can be behind `__DEV__`):

1. **Render timing**
   - Wrap `Home` and `DetailScreen` render with `Performance.mark` / `measure`.
   - Log when render time > 32 ms (2 dropped frames).

2. **Derivation timing**
   - Time `useHomeData` hook body and `useDetailBildschirmLogic` setup.
   - Time `buildBudgetSnapshot`, `buildHotDocs`, `analyzeAllTargets`, `buildPeerComparison`, `buildTimelineView`.

3. **Storage / memory**
   - Log AsyncStorage read/write sizes and durations at app start and after edits.
   - Use `console.log` or Sentry breadcrumb for total document count and approximate metadata size.

4. **Background work**
   - Log sync duration, conflict count, and bytes transferred.
   - Count how many documents are scanned by digest / suggestions / notifications.

5. **User-perceived metrics**
   - Time from tap on a document card to first meaningful paint of Detail screen.
   - Time from app launch to interactive Home.

---

## 8. Conclusion

The app is currently built around the assumption that the entire document library fits comfortably in memory and can be re-scanned on every render. That assumption breaks between **250 and 1 000 documents** on older Android devices.

The quick wins in the first PR are correct and safe, but they only treat symptoms. The durable fix requires:

1. Not loading the full library into every screen.
2. Virtualizing every long list.
3. Moving heavy fields (`rohText`, pages) out of the hot metadata path.
4. Replacing always-on JS work with lazy or native-driven work.
5. Making background sync incremental instead of full-library.

Until these structural changes land, performance will degrade super-linearly with document count.
