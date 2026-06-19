import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useStore } from '@/store';
import { useAuth } from '@/providers/AuthContext';
import { useT } from '@/hooks/useT';
import { canAddDocument, recordDocument } from '@/services/guestLimitService';
import {
  getPendingAndroidShareUris,
  getPendingNativeAndroidShareUris,
  removeBufferedUri,
  subscribeAndroidShareIntents,
} from '@/services/androidShareIntentBridge';
import {
  normaliseSharedUri,
  extractFileNameFromUri,
} from '@/services/ShareUploadService';
import { detectFileType } from '@/services/ShareUploadService';
import { setPendingSharedAsset } from '@/services/pendingShareUpload';

const PDF_EXTENSIONS = /\.(pdf)$/i;
const IMAGE_EXTENSIONS = /\.(jpe?g|png|heic|tiff?|webp|bmp)$/i;
const SHARE_SCHEMES = /^(file|content):\/\//;

function isShareableUri(uri: string): boolean {
  if (SHARE_SCHEMES.test(uri)) return true;
  if (PDF_EXTENSIONS.test(uri)) return true;
  if (IMAGE_EXTENSIONS.test(uri)) return true;
  return false;
}

function dedupeUris(uris: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const uri of uris) {
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    out.push(uri);
  }
  return out;
}

export interface PendingShare {
  uri: string;
  fileName: string;
}

// Handles file URIs arriving from:
//   iOS  — "Open With → BriefPilot" (file:// URL via Linking)
//   Android — ACTION_VIEW via Linking; ACTION_SEND via BriefPilotShareIntent native bridge

export function useShareHandler() {
  const { storeHydrated } = useStore();
  const router = useRouter();
  const { user, loading: authLoading, loginWithGoogle } = useAuth();
  const { t: T } = useT();

  const processingRef = useRef(false);
  const pendingUrisRef = useRef<string[]>([]);
  const userRef = useRef(user);
  // Stable ref to latest enqueueUris — subscriptions use this so they never need to
  // teardown/re-register when enqueueUris reference changes between renders.
  const enqueueUrisRef = useRef<(uris: string[]) => void>(() => {});
  // Accumulates cold-start URIs if the cold-start effect is cancelled mid-flight.
  // getPendingAndroidShareUris() drains the native queue immediately, so drained
  // URIs must survive effect cancellation to be processed in the next effect run.
  const drainedUrisRef = useRef<string[]>([]);

  const [pendingShare, setPendingShare] = useState<PendingShare | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { userRef.current = user; }, [user]);

  // When React commits pendingShare, the URI has been successfully received by a
  // stable (non-unmounting) component → safe to remove from the module-level warm
  // buffer. This effect does NOT run on unmounting components, so a concurrent
  // "Running main" that replaces the React root will leave the buffer intact for
  // the new root's cold-start drain to pick up.
  useEffect(() => {
    if (pendingShare?.uri) removeBufferedUri(pendingShare.uri);
  }, [pendingShare?.uri]); // eslint-disable-line react-hooks/exhaustive-deps

  // Show sheet IMMEDIATELY on URI receipt — file copy is deferred to confirmAnalyse.
  // This prevents normaliseSharedUri / FileSystem.copyAsync failures from silently
  // swallowing the share event before the user ever sees anything.
  const handleUri = useCallback(async (rawUri: string) => {
    if (!rawUri || processingRef.current) {
      return;
    }
    if (!isShareableUri(rawUri)) {
      return;
    }

    processingRef.current = true;
    try {
      const canAdd = await canAddDocument();
      const currentUser = userRef.current;
      if (currentUser?.isGuest && !canAdd) {
        Alert.alert(
          T('guest.limit.title'),
          T('guest.limit.body'),
          [
            { text: T('guest.limit.cta_later'), style: 'cancel' },
            { text: T('guest.limit.cta_register'), onPress: () => router.push('/login') },
            { text: T('guest.limit.cta_google'), onPress: () => { void loginWithGoogle(); } },
          ],
        );
        processingRef.current = false;
        return;
      }

      const fileName = extractFileNameFromUri(rawUri);
      setPendingShare({ uri: rawUri, fileName });
      // processingRef stays true until user acts (confirm or dismiss)
    } catch (e) {
      console.warn('[ShareHandler] handleUri error:', e);
      processingRef.current = false;
    }
  }, [T, router, loginWithGoogle]); // eslint-disable-line react-hooks/exhaustive-deps

  const dismissShare = useCallback(() => {
    setPendingShare(null);
    processingRef.current = false;
  }, []);

  const confirmAnalyse = useCallback(async () => {
    if (!pendingShare) return;
    const { uri: rawUri } = pendingShare;
    setPendingShare(null);
    setProcessing(true);
    console.warn('[ShareHandler] confirmAnalyse: handoff started for', rawUri.slice(0, 100));
    try {
      let resolvedUri = rawUri;
      const normalised = await normaliseSharedUri(rawUri);
      if (normalised) {
        resolvedUri = normalised;
        console.warn('[ShareHandler] URI normalised:', resolvedUri.slice(0, 100));
      } else {
        console.warn('[ShareHandler] normaliseSharedUri failed — using raw URI fallback:', rawUri.slice(0, 100));
      }
      const fileName = extractFileNameFromUri(rawUri);
      const fileType = detectFileType(resolvedUri);
      setPendingSharedAsset({
        uri: resolvedUri,
        name: fileName,
        mimeType: fileType === 'pdf'
          ? 'application/pdf'
          : fileType === 'image'
            ? 'image/jpeg'
            : 'application/octet-stream',
        source: 'file',
        displayName: fileName,
        previewUri: fileType === 'image' ? resolvedUri : undefined,
      });
      console.warn('[ShareHandler] pending shared asset set — routing to Kamera');
      router.push('/(tabs)/Kamera');
    } finally {
      setProcessing(false);
      processingRef.current = false;
    }
  }, [pendingShare, router]);

  const processUris = useCallback(async (uris: string[]) => {
    const novel = dedupeUris(uris);
    for (const uri of novel) {
      await handleUri(uri);
    }
  }, [handleUri]);

  // Both auth and store must be ready before processing share URIs.
  const notReady = authLoading || !storeHydrated;

  const enqueueUris = useCallback((uris: string[]) => {
    const novel = dedupeUris(uris);
    if (!novel.length) return;
    if (notReady) {
      pendingUrisRef.current.push(...novel);
      pendingUrisRef.current = dedupeUris(pendingUrisRef.current);
      return;
    }
    void processUris(novel);
  }, [notReady, processUris]);

  // Keep ref in sync so stable subscriptions always call the latest enqueueUris.
  useEffect(() => { enqueueUrisRef.current = enqueueUris; }, [enqueueUris]);

  // Flush URIs queued while auth/store was hydrating.
  useEffect(() => {
    if (notReady) return;
    if (!pendingUrisRef.current.length) return;
    const batch = pendingUrisRef.current.splice(0);
    void processUris(batch);
  }, [notReady, processUris]);

  // Cold start: native ACTION_SEND pending queue + iOS Linking ("Open With").
  // Android uses the native bridge exclusively — Linking.getInitialURL() on Android
  // triggers Expo Router's own linking machinery ("configured in multiple places" warning)
  // which remounts the navigation tree and resets share state before the sheet renders.
  // drainedUrisRef ensures URIs drained from the native queue are not lost when
  // this effect re-runs (notReady change) before the async body completes.
  useEffect(() => {
    if (notReady) return;
    let cancelled = false;
    (async () => {
      const [linkUrl, nativeUris] = await Promise.all([
        Platform.OS === 'ios' ? Linking.getInitialURL() : Promise.resolve(null),
        getPendingAndroidShareUris(),
      ]);
      // Persist drained URIs BEFORE checking cancelled.
      // The native queue is already emptied by this point; they must not be discarded.
      if (nativeUris.length) drainedUrisRef.current.push(...nativeUris);
      if (cancelled) return;
      const saved = drainedUrisRef.current.splice(0);
      const uris = dedupeUris([...saved, ...(linkUrl ? [linkUrl] : [])]);
      if (uris.length) enqueueUrisRef.current(uris);
    })();
    return () => { cancelled = true; };
  }, [notReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm: Linking ACTION_VIEW — iOS only.
  // Android: skip — native bridge handles all intents and Linking.addEventListener
  // conflicts with Expo Router's built-in Linking listener, causing "Looks like you
  // have configured linking in multiple places" + navigation tree remount on share.
  useEffect(() => {
    if (Platform.OS === 'android') return;
    const sub = Linking.addEventListener('url', ({ url }) => { enqueueUrisRef.current([url]); });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Warm: native ACTION_SEND — stable, never re-subscribes between renders.
  // Frequent re-subscription caused listener gaps during which share events were lost.
  useEffect(() => {
    return subscribeAndroidShareIntents((uris) => {
      enqueueUrisRef.current(uris);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Foreground drain: recovers URIs stuck in the native pending queue when
  // hasActiveReactInstance()=false prevented emitShareUris from firing.
  // Uses getPendingNativeAndroidShareUris (native queue only) — must NOT drain
  // the module-level warm buffer here, as the buffer must be preserved for a
  // concurrently mounting new React root's cold-start drain.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState !== 'active') return;
      getPendingNativeAndroidShareUris().then(uris => {
        if (uris.length) enqueueUrisRef.current(uris);
      }).catch(() => {});
    });
    return () => sub.remove();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return { pendingShare, processing, dismissShare, confirmAnalyse };
}
