import { useState, useCallback } from 'react';
import { getPendingApprovals, resolveApproval } from '../services/v4Api';

export type ApprovalDecision = 'approved' | 'rejected';

export function useApprovalFlow(defaultOrgId?: string) {
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (orgId?: string): Promise<any[]> => {
    setLoading(true);
    setError(null);
    try {
      const raw = await getPendingApprovals(orgId ?? defaultOrgId ?? '');
      const data = Array.isArray(raw) ? raw : (raw?.requests ?? []);
      setApprovals(data);
      return data ?? [];
    } catch (e: any) {
      setError(e?.message ?? 'Laden fehlgeschlagen');
      return [];
    } finally {
      setLoading(false);
    }
  }, [defaultOrgId]);

  const resolve = useCallback(async (
    requestId: string,
    decision: ApprovalDecision,
    comment?: string
  ): Promise<boolean> => {
    setError(null);
    try {
      await resolveApproval(requestId, decision, (comment ?? null) as any);
      setApprovals(prev => prev.filter(a => a.id !== requestId));
      return true;
    } catch (e: any) {
      setError(e?.message ?? 'Aktion fehlgeschlagen');
      return false;
    }
  }, []);

  return { approvals, loading, error, load, resolve };
}
