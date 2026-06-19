import { NativeEventEmitter, NativeModules, Platform } from 'react-native';

const EVENT_NAME = 'BriefPilotShareIntentReceived';

// Module-level buffer — lives in the JS module scope and survives React root
// remounts ("Running 'main'" in the same JS context). When a warm share arrives
// while the existing React tree is being replaced (e.g. Expo Bridgeless creates
// a new surface), emitShareUris fires the NativeEventEmitter event and removes
// the URI from the native pending queue. The old subscription picks it up but
// calls setState on an unmounting component (silently ignored). The new root's
// cold-start drain calls getPendingAndroidShareUris() which finds the native
// queue empty — but this module-level buffer still has the URI.
const _warmUriBuffer: string[] = [];

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

/**
 * Drain ACTION_SEND URIs for the cold-start effect.
 * Drains BOTH the native pending queue AND the module-level warm buffer.
 * Only call this from the cold-start useEffect — not from the AppState drain,
 * which must use getPendingNativeAndroidShareUris() to leave the warm buffer
 * intact for a concurrently mounting new React root.
 */
export async function getPendingAndroidShareUris(): Promise<string[]> {
  const mod = getModule();
  // Drain module-level buffer first (warm URIs that survived a React root remount)
  const buffered = _warmUriBuffer.splice(0);
  if (!mod) return buffered;
  try {
    const native = await mod.getPendingShareUris();
    const nativeFiltered = Array.isArray(native) ? native.filter(Boolean) : [];
    // Dedupe: native queue and buffer may overlap if emitShareUris did not
    // call removePending (should not happen with current Kotlin code, but safe).
    const seen = new Set<string>(buffered);
    for (const u of nativeFiltered) {
      if (!seen.has(u)) { seen.add(u); buffered.push(u); }
    }
    return buffered;
  } catch {
    return buffered;
  }
}

/**
 * Drain ACTION_SEND URIs for the AppState foreground drain.
 * Only touches the native queue — does NOT drain the module-level warm buffer.
 * This preserves buffered warm URIs for a concurrently mounting new React root's
 * cold-start drain, which is the only consumer that should empty the buffer.
 */
export async function getPendingNativeAndroidShareUris(): Promise<string[]> {
  const mod = getModule();
  if (!mod) return [];
  try {
    const uris = await mod.getPendingShareUris();
    return Array.isArray(uris) ? uris.filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * Remove a single URI from the module-level warm buffer.
 * Call this from a useEffect (not inline) after React has committed pendingShare,
 * so that unmounting components never prematurely clean the buffer.
 */
export function removeBufferedUri(uri: string): void {
  const idx = _warmUriBuffer.indexOf(uri);
  if (idx !== -1) _warmUriBuffer.splice(idx, 1);
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
      if (!uris.length) return;
      // Mirror into module-level buffer so a concurrent React root remount
      // can pick up the URIs via getPendingAndroidShareUris() even after the
      // native queue has been cleared by emitShareUris → removePending.
      _warmUriBuffer.push(...uris);
      onUris(uris);
    },
  );
  return () => sub.remove();
}
