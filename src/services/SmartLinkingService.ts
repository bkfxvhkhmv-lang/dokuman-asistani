/**
 * Smart Document Linking — V12 Sprint 4
 *
 * Offline-first automatic relationship detection between documents.
 * Link types: absender, vorgang, folgedokument, zahlung_bezug, anhang
 */

import type { Dokument } from '../store';
import { findeAehnlicheDokumente } from '../utils';

// ── Types ─────────────────────────────────────────────────────────────────────

export type LinkType =
  | 'gleicher_absender'    // same sender, different doc
  | 'gleicher_vorgang'     // same case/aktenzeichen
  | 'folgedokument'        // Rechnung → Mahnung chain
  | 'zahlung_bezug'        // invoice → payment
  | 'vertrag_ergaenzung'   // contract + amendment/annex
  | 'ähnlicher_inhalt';    // semantic similarity

export interface DocumentLink {
  vonId:       string;
  nachId:      string;
  type:        LinkType;
  label:       string;
  confidence:  number;   // 0–100
  beschreibung: string;
  icon:        string;
  bidirektional: boolean;
}

export interface LinkingResult {
  links:           DocumentLink[];
  topLinks:        DocumentLink[];   // sorted by confidence, max 5
  clusterGruppen:  DokumentCluster[];
}

export interface DokumentCluster {
  id:        string;
  label:     string;
  icon:      string;
  dokIds:    string[];
  linkType:  LinkType;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function absenderAehnlich(a: string | null | undefined, b: string | null | undefined): boolean {
  if (!a || !b) return false;
  const normalize = (s: string) => s.toLowerCase()
    .replace(/gmbh|ag|kg|e\.v\.|ltd|inc|ug/g, '')
    .replace(/\s+/g, ' ').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // First word match (e.g. "Finanzamt München" ↔ "Finanzamt Berlin")
  const wa = na.split(' ')[0];
  const wb = nb.split(' ')[0];
  return wa.length >= 4 && wa === wb;
}

const FOLGE_KETTEN: Record<string, string[]> = {
  Rechnung:        ['Mahnung', 'Steuerbescheid'],
  Mahnung:         ['Rechnung'],
  Steuerbescheid:  ['Behördenbescheid', 'Rechnung'],
  Behördenbescheid:['Steuerbescheid', 'Kündigung'],
  Kündigung:       ['Vertrag'],
  Vertrag:         ['Kündigung', 'Rechnung'],
};

// ── Link builders ─────────────────────────────────────────────────────────────

function linkGleicherAbsender(a: Dokument, b: Dokument): DocumentLink | null {
  if (!absenderAehnlich(a.absender, b.absender)) return null;
  if (a.id === b.id) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'gleicher_absender',
    label: 'Gleicher Absender',
    beschreibung: `Beide von ${a.absender}`,
    icon: '👤', confidence: 80, bidirektional: true,
  };
}

function linkGleicherVorgang(a: Dokument, b: Dokument): DocumentLink | null {
  if (a.id === b.id) return null;
  const az1 = (a as any).aktenzeichen;
  const az2 = (b as any).aktenzeichen;
  if (!az1 || !az2 || az1.length < 4) return null;
  if (az1.toLowerCase() !== az2.toLowerCase()) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'gleicher_vorgang',
    label: 'Gleicher Vorgang',
    beschreibung: `Aktenzeichen: ${az1}`,
    icon: '📎', confidence: 95, bidirektional: true,
  };
}

function linkFolgedokument(a: Dokument, b: Dokument): DocumentLink | null {
  if (a.id === b.id) return null;
  const nachfolger = FOLGE_KETTEN[a.typ] || [];
  if (!nachfolger.includes(b.typ)) return null;
  if (!absenderAehnlich(a.absender, b.absender)) return null;
  // Temporal: b should be newer than a
  if (a.datum && b.datum && new Date(b.datum) < new Date(a.datum)) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'folgedokument',
    label: `${a.typ} → ${b.typ}`,
    beschreibung: `Typischer Dokumentenfluss`,
    icon: '➡', confidence: 72, bidirektional: false,
  };
}

function linkZahlungsBezug(a: Dokument, b: Dokument): DocumentLink | null {
  if (a.id === b.id) return null;
  const rechnungsTypen = ['Rechnung', 'Mahnung', 'Bußgeld', 'Steuerbescheid'];
  if (!rechnungsTypen.includes(a.typ)) return null;
  if (b.typ !== 'Rechnung' && b.typ !== 'Mahnung') return null;
  if (!absenderAehnlich(a.absender, b.absender)) return null;
  // Same amount = probably same transaction
  if (!a.betrag || !b.betrag) return null;
  const diff = Math.abs((a.betrag as number) - (b.betrag as number));
  if (diff > 1) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'zahlung_bezug',
    label: 'Gleicher Betrag',
    beschreibung: `Betrag ${(a.betrag as number).toFixed(2)} € — möglicherweise dasselbe`,
    icon: '💶', confidence: 85, bidirektional: true,
  };
}

function linkVertragErgaenzung(a: Dokument, b: Dokument): DocumentLink | null {
  if (a.id === b.id) return null;
  if (a.typ !== 'Vertrag' || b.typ !== 'Vertrag') return null;
  if (!absenderAehnlich(a.absender, b.absender)) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'vertrag_ergaenzung',
    label: 'Verwandter Vertrag',
    beschreibung: `Beide Verträge mit ${a.absender}`,
    icon: '📋', confidence: 65, bidirektional: true,
  };
}

function linkAehnlicherInhalt(a: Dokument, b: Dokument, score: number): DocumentLink | null {
  if (a.id === b.id || score < 3) return null;
  return {
    vonId: a.id, nachId: b.id, type: 'ähnlicher_inhalt',
    label: 'Ähnliches Dokument',
    beschreibung: `Inhaltliche Übereinstimmung`,
    icon: '🔗', confidence: Math.min(90, score * 15), bidirektional: true,
  };
}

// ── Main: find links for one document ─────────────────────────────────────────

export function findLinksForDocument(dok: Dokument, alleDocs: Dokument[]): LinkingResult {
  const links: DocumentLink[] = [];
  const andere = alleDocs.filter(d => d.id !== dok.id);

  for (const other of andere) {
    const candidates = [
      linkGleicherVorgang(dok, other),   // highest priority
      linkZahlungsBezug(dok, other),
      linkFolgedokument(dok, other),
      linkVertragErgaenzung(dok, other),
      linkGleicherAbsender(dok, other),
    ].filter((l): l is DocumentLink => l !== null);

    // Only take the best link per document pair
    if (candidates.length > 0) {
      candidates.sort((a, b) => b.confidence - a.confidence);
      links.push(candidates[0]);
    }
  }

  // Content similarity (existing util)
  const aehnliche = findeAehnlicheDokumente(dok, alleDocs, 5);
  for (const sim of aehnliche) {
    const alreadyLinked = links.some(l => l.nachId === sim.id);
    if (!alreadyLinked) {
      const l = linkAehnlicherInhalt(dok, sim, sim._aehnlichScore);
      if (l) links.push(l);
    }
  }

  // Sort by confidence
  links.sort((a, b) => b.confidence - a.confidence);

  // Build clusters: group by link type
  const clusterMap: Map<string, string[]> = new Map();
  for (const link of links) {
    const key = `${link.type}_${link.type === 'gleicher_absender' ? dok.absender : ''}`;
    if (!clusterMap.has(key)) clusterMap.set(key, []);
    clusterMap.get(key)!.push(link.nachId);
  }

  const clusterGruppen: DokumentCluster[] = [];
  for (const [key, ids] of clusterMap) {
    if (ids.length < 2) continue;
    const type = key.split('_')[0] as LinkType;
    const CLUSTER_META: Record<string, { label: string; icon: string }> = {
      gleicher_absender: { label: `Alle von ${dok.absender}`, icon: '👤' },
      gleicher_vorgang:  { label: 'Gleicher Vorgang', icon: '📎' },
      folgedokument:     { label: 'Dokumentkette', icon: '➡' },
      zahlung_bezug:     { label: 'Zahlungsbelege', icon: '💶' },
      vertrag_ergaenzung:{ label: 'Vertragsunterlagen', icon: '📋' },
      ähnlicher_inhalt:  { label: 'Ähnliche Dokumente', icon: '🔗' },
    };
    const meta = CLUSTER_META[type] || { label: type, icon: '📁' };
    clusterGruppen.push({ id: key, ...meta, dokIds: [dok.id, ...ids], linkType: type });
  }

  return { links, topLinks: links.slice(0, 5), clusterGruppen };
}

// ── Build full link graph for all docs ────────────────────────────────────────

export function buildLinkGraph(docs: Dokument[]): Map<string, DocumentLink[]> {
  const graph = new Map<string, DocumentLink[]>();
  for (const dok of docs) {
    graph.set(dok.id, findLinksForDocument(dok, docs).topLinks);
  }
  return graph;
}
