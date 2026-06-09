import type { Router } from 'expo-router';
import { consumePendingFirstValueNavigation } from '@/product/onboardingStorage';
import { safeBack } from '@/navigation/safeBack';

export async function finishScanFlow(
  router: Router,
  dokId?: string | null,
): Promise<void> {
  if (!dokId) {
    safeBack(router);
    return;
  }

  const useFirst = await consumePendingFirstValueNavigation();

  if (useFirst) {
    router.replace({ pathname: '/first-value', params: { dokId } });
  } else {
    router.replace({ pathname: '/detail', params: { dokId, tab: 'ozet' } });
  }
}
