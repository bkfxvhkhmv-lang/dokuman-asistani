import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Dokument } from '../../../store';
import type { DocumentDigitalTwinModel } from '../../../core/intelligence/DocumentDigitalTwin';
import type { GeneratedWorkflow } from '../../../core/intelligence/AutoWorkflowEngine';
import type { OutcomePrediction } from '../../../core/intelligence/OutcomePredictor';
import { QK } from '../../../hooks/queryHooks';

// InstitutionBehaviorModel ve IntentDetector kendi tiplerini export etmiyor — minimal shape
export interface InstitutionDesc { name?: string; description?: string; category?: string; [k: string]: unknown }
export interface DocIntent { label?: string; color?: string; emoji?: string; [k: string]: unknown }

export function useDocumentAI(dok: Dokument | undefined) {
  const queryClient = useQueryClient();

  // Seed from pre-fetched cache — if Predictive Pre-fetching ran, data is instant
  const cachedTwin = dok?.id
    ? queryClient.getQueryData<DocumentDigitalTwinModel>(QK.twin(dok.id)) ?? null
    : null;

  const [digitalTwin,      setDigitalTwin]      = useState<DocumentDigitalTwinModel | null>(cachedTwin);
  const [workflow,         setWorkflow]          = useState<GeneratedWorkflow | null>(null);
  const [institutionDesc,  setInstitutionDesc]   = useState<InstitutionDesc | null>(null);
  const [docIntent,        setDocIntent]         = useState<DocIntent | null>(null);
  const [outcomePrediction,setOutcomePrediction] = useState<OutcomePrediction | null>(null);

  useEffect(() => {
    if (!dok) return;
    let cancelled = false;

    // Skip computation if pre-fetched data is already in cache (Predictive Pre-fetching)
    const prefetched = queryClient.getQueryData<DocumentDigitalTwinModel>(QK.twin(dok.id));
    if (prefetched) {
      if (!cancelled) setDigitalTwin(prefetched);
    } else {
      import('../../../core/intelligence/DocumentDigitalTwin')
        .then(({ DocumentDigitalTwin }) =>
          DocumentDigitalTwin.build(dok).then(r => {
            if (!cancelled) {
              setDigitalTwin(r);
              // Write back to cache so future opens are instant too
              queryClient.setQueryData(QK.twin(dok.id), r);
            }
          })
        )
        .catch(e => console.warn('[AI] digitalTwin error', e));
    }

    import('../../../core/intelligence/AutoWorkflowEngine')
      .then(({ AutoWorkflowEngine }) =>
        AutoWorkflowEngine.generate(dok).then(r => { if (!cancelled) setWorkflow(r); })
      )
      .catch(e => console.warn('[AI] workflow error', e));

    import('../../../core/intelligence/InstitutionBehaviorModel')
      .then(({ InstitutionBehaviorModel }) => {
        InstitutionBehaviorModel.learn(dok).catch(e => console.warn('[AI] learn error', e));
        if (dok.absender) {
          InstitutionBehaviorModel.describeInstitution(dok.absender)
            .then(r => { if (!cancelled) setInstitutionDesc(r as unknown as InstitutionDesc); })
            .catch(e => console.warn('[AI] institutionDesc error', e));
        }
      })
      .catch(e => console.warn('[AI] InstitutionBehaviorModel import error', e));

    import('../../../core/intelligence/IntentDetector')
      .then(({ detectIntent }) => {
        try {
          if (!cancelled) setDocIntent(detectIntent(dok) as unknown as DocIntent);
        } catch (e) { console.warn('[AI] detectIntent error', e); }
      })
      .catch(e => console.warn('[AI] IntentDetector import error', e));

    import('../../../core/intelligence/OutcomePredictor')
      .then(({ OutcomePredictor }) =>
        OutcomePredictor.predict(dok).then(r => { if (!cancelled) setOutcomePrediction(r); })
      )
      .catch(e => console.warn('[AI] outcomePrediction error', e));

    import('../../../core/intelligence/UserBehaviorModel')
      .then(({ UserBehaviorModel }) => UserBehaviorModel.recordOpen(dok).catch(() => null))
      .catch(e => console.warn('[AI] UserBehaviorModel error', e));

    import('../../../core/intelligence/DocumentMemory')
      .then(({ DocumentMemory }) => DocumentMemory.recordOpen(dok.id).catch(() => null))
      .catch(e => console.warn('[AI] DocumentMemory error', e));

    return () => { cancelled = true; };
  }, [dok?.id]);

  return { digitalTwin, workflow, institutionDesc, docIntent, outcomePrediction };
}
