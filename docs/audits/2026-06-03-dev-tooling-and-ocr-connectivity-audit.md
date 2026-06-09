## 1. Current state

Aktif test platformu: Both

This audit separates two independent problems:

- Track A: local iOS dev-client run/install instability
- Track B: OCR analyze connectivity instability

No code or backend changes were made in this audit.

Current repo state observed during the audit:

- App repo worktree is not clean:
  - `src/providers/BackendHealthBootstrap.tsx`
  - `docs/audits/2026-06-03-signed-pdf-fullscreen-preview-fix.md`
  - `docs/audits/2026-06-03-smoke-known-issues.md`
  - `run_ios.sh`

That matters because current runtime behavior may not match the last committed state.

## 2. Commands run

### Track A — iOS local dev-client tooling

```bash
xcodebuild -version
npx expo --version
node -v
xcrun devicectl list devices
xcrun xctrace list devices
npx expo run:ios --device "iPhone von Bayram"
EXPO_APPLE_DEVICE_UDID="00008101-00054469023A001E" npx expo run:ios
```

### Track B — OCR analyze connectivity

```bash
rg -n "API_BASE|OCR_MVP_BASE|analyze|health|documents/" src/config.ts src/providers/BackendHealthBootstrap.tsx src/services src/features
curl -sS --max-time 5 http://192.168.0.93:8000/api/v4/health
curl -sS --max-time 5 -X POST http://192.168.0.93:8000/documents/analyze -H 'Content-Type: multipart/form-data' -F 'file=@/etc/hosts'
curl -sS --max-time 5 -X POST http://192.168.0.93:8000/api/v4/documents/analyze -H 'Content-Type: multipart/form-data' -F 'file=@/etc/hosts'
sed -n '1,220p' src/providers/BackendHealthBootstrap.tsx
sed -n '1,240p' src/services/ocrMvpApi.ts
sed -n '1,220p' src/config.ts
git status --short
```

## 3. Evidence

### Track A — iOS tooling evidence

Environment:

- Xcode: `26.5` (`17F42`)
- Expo CLI: `54.0.24`
- Node: `v25.9.0`

`xcrun devicectl list devices`:

- `iPhone von Bayram` → `161E030A-904B-5CE0-9389-6C5D1F6DB344` → `available (paired)`

`xcrun xctrace list devices`:

- `iPhone von Bayram (26.5)` → `00008101-00054469023A001E`
- listed under `Devices Offline`
- simulator list includes `iPhone 17 Pro Simulator (26.5) (624AF0DF-D17F-4435-9A03-95B11374813E)`

`npx expo run:ios --device "iPhone von Bayram"` output:

- `Unexpected devicectl JSON version output from devicectl. Connecting to physical Apple devices may not work as expected.`
- `Using --device 00008101-00054469023A001E`
- build planning starts, but this already shows Expo is using the `xctrace`-style UDID path, not the `devicectl` path

`EXPO_APPLE_DEVICE_UDID="00008101-00054469023A001E" npx expo run:ios` failed with:

- `ENOENT: no such file or directory, rename .../.expo/prebuild/cached-packages.json...`

This is a separate Expo prebuild/cache failure, not a backend issue.

### Track B — OCR connectivity evidence

Current app contract from source:

- `API_BASE` in dev:
  - `http://<host>:8000/api/v4`
- `OCR_MVP_BASE` in current working tree:
  - `http://<host>:8000`
- `BackendHealthBootstrap` currently checks:
  - `${OCR_MVP_BASE}/health`
- OCR analyze currently calls:
  - `${OCR_MVP_BASE}/documents/analyze`

Direct backend checks:

`GET http://192.168.0.93:8000/api/v4/health`

- returned JSON successfully

`POST http://192.168.0.93:8000/documents/analyze`

- returned:
  - `{"detail":"Desteklenmeyen dosya tipi: . İzin verilenler: .jpg, .jpeg, .pdf, .png"}`
- this proves the **prefix-less** route is live and reachable

`POST http://192.168.0.93:8000/api/v4/documents/analyze`

- returned:
  - `{"detail":"Not Found"}`
- this proves the `/api/v4` analyze route is **not** currently live on the backend instance being tested

Implication:

- current local backend is serving OCR analyze on:
  - `/documents/analyze`
- not on:
  - `/api/v4/documents/analyze`

That means any app config or health logic assuming OCR MVP lives under `/api/v4` will fail against this backend instance.

## 4. Root cause candidates ranked

### Track A — iOS local dev-client tooling

#### Candidate 1 — Expo CLI 54 is not fully compatible with Xcode 26.5 physical-device tooling
Evidence:

- explicit warning:
  - `Unexpected devicectl JSON version output from devicectl`
- `devicectl` and `xctrace` disagree on device identifiers/state model
- transcript history already showed Expo repeatedly drifting toward simulator-like selection paths

Most likely effect:

- `expo run:ios` is unreliable for this machine + Xcode version + physical device combination

#### Candidate 2 — Expo device selection path is mixing two identifier systems
Evidence:

- `devicectl` device ID:
  - `161E030A-904B-5CE0-9389-6C5D1F6DB344`
- `xctrace` device UDID:
  - `00008101-00054469023A001E`

Most likely effect:

- Expo can select one identifier system while install/build tools expect another

#### Candidate 3 — local Expo prebuild cache is unstable
Evidence:

- `ENOENT ... rename .../.expo/prebuild/cached-packages.json...`

Most likely effect:

- even when device targeting is corrected, Expo may still fail before launch due to cache/prebuild bookkeeping

### Track B — OCR analyze failure

#### Candidate 1 — app/backend OCR base path contract mismatch
Evidence:

- app OCR code calls `${OCR_MVP_BASE}/documents/analyze`
- current backend responds on `/documents/analyze`
- `/api/v4/documents/analyze` is `Not Found`

Most likely effect:

- if `OCR_MVP_BASE` ever includes `/api/v4`, analyze fails immediately

#### Candidate 2 — health route contract mismatch
Evidence:

- current bootstrap checks `${OCR_MVP_BASE}/health`
- tested backend health success was shown on `/api/v4/health`
- analyze success path was shown on `/documents/analyze`

Most likely effect:

- health and analyze are not guaranteed to live under the same prefix in the current local setup
- this can create false offline states even when analyze itself would work

#### Candidate 3 — runtime bundle may not match current working tree
Evidence:

- app repo worktree is dirty
- current source state and device bundle state may differ until a confirmed reload/rebuild with logs is captured

Most likely effect:

- operator cannot trust source inspection alone; request URL must be logged from the device/session

## 5. Recommended fix

### Track A — iOS local dev-client tooling

Reliable local command:

- Do **not** treat `npx expo run:ios` as the reliable path on this setup

Fallback command path:

- `xcodebuild` + manual install remains the safer local fallback on this machine

What not to use as the primary path:

- `npx expo run:ios --device ...` as the sole physical-device workflow on Xcode 26.5

Recommended operational decision:

1. Use terminal-driven `xcodebuild`/install flow locally for physical iOS smoke
2. Prefer EAS dev build for stable physical-device smoke if repeatability matters more than local iteration speed
3. Treat Expo CLI physical-device run as non-authoritative until Expo/Xcode compatibility improves

### Track B — OCR analyze failure

Recommended immediate discipline:

1. Freeze further config/backend edits
2. Decide one local OCR contract explicitly:
   - either OCR local backend is rooted at `/`
   - or OCR local backend is rooted at `/api/v4`
3. Then make **both** of these agree:
   - `OCR_MVP_BASE`
   - backend route mount
4. Capture real device-side request evidence before any further change:
   - analyze URL
   - status
   - response body

Most likely current truth from evidence in this audit:

- local OCR backend currently expects prefix-less routes:
  - `/documents/analyze`
  - likely `/health` or a mixed health path depending on local mount state

So the first thing to confirm before any patch is:

- what the backend process currently exposes for `GET /health`
- what the app currently requests for OCR analyze on-device

## 6. Exact validation steps

### Track A — iOS tooling

1. Run:
   ```bash
   xcrun devicectl list devices
   xcrun xctrace list devices
   ```
2. Record both identifiers for the physical device
3. Try Expo only as evidence gathering:
   ```bash
   npx expo run:ios --device "iPhone von Bayram"
   ```
4. If the warning about `devicectl JSON version` appears again, stop treating Expo as the primary local path
5. Use terminal `xcodebuild` + install flow as the local fallback

### Track B — OCR analyze

1. Confirm backend routes with curl:
   ```bash
   curl http://<host>:8000/health
   curl http://<host>:8000/api/v4/health
   curl -X POST http://<host>:8000/documents/analyze -F 'file=@...'
   curl -X POST http://<host>:8000/api/v4/documents/analyze -F 'file=@...'
   ```
2. Capture one device request with temporary debug only, no permanent patch:
   - analyze URL
   - status
   - body
   - network error if thrown
3. Verify that the device request URL matches the backend route that curl proved live
4. Only then choose the single contract and patch one side

## Bottom line

- Track A root cause is most likely **Expo CLI 54 + Xcode 26.5 physical-device incompatibility**, plus mixed identifier sources.
- Track B root cause is most likely **OCR base path mismatch** between app config and the local backend route contract.
