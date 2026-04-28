import { useEffect, useMemo, useState } from 'react';
import { useStore } from '../../../store';
import { useTheme } from '../../../ThemeContext';
import { useDocumentAI } from './useDocumentAI';
import { useDocumentDerived } from './useDocumentDerived';

export function useDocumentDetail(dokId: string, ozetQuellenSichtbar = false) {
  const { state, dispatch } = useStore();
  const { Colors, RiskColors, Shadow, S, R } = useTheme();

  const dok = state.dokumente.find(d => d.id === dokId);

  useEffect(() => {
    if (dok && !dok.gelesen) {
      dispatch({ type: 'MARK_GELESEN', id: dokId });
    }
  }, [dok?.id, dok?.gelesen, dispatch, dokId]);

  const ai = useDocumentAI(dok);

  const [documentChain, setDocumentChain] = useState<any>(null);
  useEffect(() => {
    if (!dok) return;
    import('../services/documentChainEngine')
      .then(({ buildDocumentChain }) => setDocumentChain(buildDocumentChain(dok, ai.digitalTwin)))
      .catch(e => console.warn('[useDocumentDetail] documentChain error', e));
  }, [dok?.id, ai.digitalTwin]);

  const derived = useDocumentDerived({
    dok,
    dokId,
    state,
    Colors,
    RiskColors,
    ozetQuellenSichtbar,
  });

  return {
    dok,
    dispatch,
    state,
    Colors,
    Shadow,
    S,
    R,
    documentChain,
    ...ai,
    ...derived,
  };
}
