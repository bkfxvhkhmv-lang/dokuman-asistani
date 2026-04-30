import type { Router } from 'expo-router';

/** Deterministic zurück: Tabs-Start, wenn kein Stack mehr für `back` existiert. */
export function safeBack(router: Router): void {
  if (router.canGoBack()) {
    router.back();
  } else {
    router.replace('/(tabs)/index');
  }
}
