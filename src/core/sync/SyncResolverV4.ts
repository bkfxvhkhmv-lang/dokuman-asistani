export type ConflictStrategy = 'lww' | 'manual';

export interface ConflictCandidate {
  localDoc: Record<string, any>;
  serverDoc: Record<string, any>;
}

export interface ResolveResult {
  winner: Record<string, any>;
  strategy: ConflictStrategy;
  needsUserInput: boolean;
}

export class SyncResolverV4 {
  static resolve(candidate: ConflictCandidate, strategy: ConflictStrategy = 'lww'): ResolveResult {
    if (strategy === 'lww') {
      const localTs  = new Date(candidate.localDoc.updated_at ?? 0).getTime();
      const serverTs = new Date(candidate.serverDoc.updated_at ?? 0).getTime();
      return {
        winner: serverTs >= localTs ? candidate.serverDoc : candidate.localDoc,
        strategy: 'lww',
        needsUserInput: false,
      };
    }
    return { winner: candidate.serverDoc, strategy: 'manual', needsUserInput: true };
  }

  static resolveMany(candidates: ConflictCandidate[], strategy: ConflictStrategy = 'lww'): ResolveResult[] {
    return candidates.map(c => this.resolve(c, strategy));
  }
}
