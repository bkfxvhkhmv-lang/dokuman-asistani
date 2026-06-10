import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const EVENT_NAME = 'BriefPilotShareIntentReceived';

type ShareIntentModule = {
  getPendingShareUris: () => Promise<string[]>;
  addListener: (eventName: string) => void;
  removeListeners: (count: number) => void;
};

function getModule(): ShareIntentModule | null {
  if (Platform.OS !== 'android') return null;
  const mod = NativeModules.BriefPilotShareIntent as ShareIntentModule | undefined;
  return mod?.getPendingShareUris ? mod : null;
}

/** Drain ACTION_SEND URIs captured on cold start before JS was ready. */
export async function getPendingAndroidShareUris(): Promise<string[]> {
  const mod = getModule();
  if (!mod) return [];
  try {
    const uris = await mod.getPendingShareUris();
    return Array.isArray(uris) ? uris.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/** Subscribe to warm ACTION_SEND intents while the app is already running. */
export function subscribeAndroidShareIntents(
  onUris: (uris: string[]) => void,
): () => void {
  const mod = getModule();
  if (!mod) return () => {};

  const emitter = new NativeEventEmitter(mod);
  const sub = emitter.addListener(
    EVENT_NAME,
    (payload: { uris?: string[] }) => {
      const uris = payload?.uris?.filter(Boolean) ?? [];
      if (uris.length) onUris(uris);
    },
  );
  return () => sub.remove();
}
