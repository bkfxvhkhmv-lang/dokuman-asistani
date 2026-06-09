import type { Dokument } from '@/store';

export type ConflictStrategy = 'local_wins' | 'remote_wins' | 'newer_wins' | 'merge';

export interface ConflictResult {
  resolved: Dokument;
  strategy: ConflictStrategy;
  hadConflict: boolean;
}

function zeitwert(datum: string | null | undefined): number {
  if (!datum) return 0;
  const wert = Date.parse(datum);
  return Number.isFinite(wert) ? wert : 0;
}

/**
 * Semantic equality — avoids false conflicts from JSON.stringify key-order
 * differences, array ordering, or null/undefined mismatches.
 *
 * Only fields that represent user-visible data are compared.
 * Volatile fields (v4DocId, workflowStamp, workflowUpdatedAt) are intentionally
 * excluded — they should not trigger a conflict on their own.
 */
const CONFLICT_FIELDS = [
  'titel', 'typ', 'absender', 'betrag', 'waehrung', 'frist',
  'risiko', 'datum', 'erledigt', 'zusammenfassung', 'warnung',
  'rohText', 'iban', 'kurzfassung', 'workflowStatus',
] as const satisfies ReadonlyArray<keyof Dokument>;

function normalisiereWert(wert: unknown): unknown {
  if (wert === undefined) return null;
  return wert;
}

function sortiereArray<T>(arr: T[]): T[] {
  return [...arr].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function hatKonflikt(local: Dokument, remote: Dokument): boolean {
  // Scalar fields
  for (const key of CONFLICT_FIELDS) {
    if (normalisiereWert(local[key]) !== normalisiereWert(remote[key])) return true;
  }

  // Array fields — compare content regardless of insertion order
  const lokal_et  = sortiereArray(local.etiketten  ?? []);
  const remote_et = sortiereArray(remote.etiketten ?? []);
  if (JSON.stringify(lokal_et) !== JSON.stringify(remote_et)) return true;

  const lokal_au  = sortiereArray((local.aufgaben  ?? []).map(a => a.id));
  const remote_au = sortiereArray((remote.aufgaben ?? []).map(a => a.id));
  if (JSON.stringify(lokal_au) !== JSON.stringify(remote_au)) return true;

  return false;
}

function vereinigeEtiketten(local: Dokument, remote: Dokument): string[] | undefined {
  const etiketten = [...(remote.etiketten ?? []), ...(local.etiketten ?? [])];
  return etiketten.length > 0 ? Array.from(new Set(etiketten)) : undefined;
}

function vereinigeAufgaben(local: Dokument, remote: Dokument): Dokument['aufgaben'] {
  const map = new Map<string, NonNullable<Dokument['aufgaben']>[number]>();

  for (const aufgabe of remote.aufgaben ?? []) {
    map.set(aufgabe.id, aufgabe);
  }

  for (const aufgabe of local.aufgaben ?? []) {
    map.set(aufgabe.id, aufgabe);
  }

  const aufgaben = Array.from(map.values());
  return aufgaben.length > 0 ? aufgaben : undefined;
}

function mergeDokument(local: Dokument, remote: Dokument): Dokument {
  const localNeuer = zeitwert(local.datum) > zeitwert(remote.datum);
  const etiketten = vereinigeEtiketten(local, remote);
  const aufgaben = vereinigeAufgaben(local, remote);

  if (!localNeuer) {
    return {
      ...remote,
      ...(etiketten ? { etiketten } : {}),
      ...(aufgaben ? { aufgaben } : {}),
    };
  }

  return {
    ...remote,
    titel: local.titel !== remote.titel ? local.titel : remote.titel,
    typ: local.typ !== remote.typ ? local.typ : remote.typ,
    absender: local.absender !== remote.absender ? local.absender : remote.absender,
    betrag: local.betrag !== remote.betrag ? local.betrag : remote.betrag,
    frist: local.frist !== remote.frist ? local.frist : remote.frist,
    risiko: local.risiko !== remote.risiko ? local.risiko : remote.risiko,
    datum: local.datum !== remote.datum ? local.datum : remote.datum,
    erledigt: local.erledigt !== remote.erledigt ? local.erledigt : remote.erledigt,
    rohText: local.rohText !== remote.rohText ? local.rohText : remote.rohText,
    v4DocId: local.v4DocId !== remote.v4DocId ? local.v4DocId : remote.v4DocId,
    ...(etiketten ? { etiketten } : {}),
    ...(aufgaben ? { aufgaben } : {}),
  };
}

export function resolveConflict(
  local: Dokument,
  remote: Dokument,
  strategy: ConflictStrategy = 'newer_wins',
): ConflictResult {
  const hadConflict = hatKonflikt(local, remote);

  if (!hadConflict) {
    return { resolved: local, strategy, hadConflict: false };
  }

  if (strategy === 'local_wins') {
    return { resolved: local, strategy, hadConflict };
  }

  if (strategy === 'remote_wins') {
    return { resolved: remote, strategy, hadConflict };
  }

  if (strategy === 'merge') {
    return { resolved: mergeDokument(local, remote), strategy, hadConflict };
  }

  const resolved = zeitwert(local.datum) >= zeitwert(remote.datum) ? local : remote;
  return { resolved, strategy, hadConflict };
}

export function resolveConflictBatch(
  pairs: Array<{ local: Dokument; remote: Dokument }>,
  strategy: ConflictStrategy = 'newer_wins',
): ConflictResult[] {
  return pairs.map(({ local, remote }) => resolveConflict(local, remote, strategy));
}
