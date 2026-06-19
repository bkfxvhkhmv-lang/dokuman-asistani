import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Linking } from 'react-native';
import { useShareHandler } from '@/hooks/useShareHandler';

const mockPush = jest.fn();
const mockGetPendingAndroidShareUris = jest.fn();
const mockSubscribeAndroidShareIntents = jest.fn(() => jest.fn());
const mockSetPendingSharedAsset = jest.fn();
let shareIntentListener: ((uris: string[]) => void) | null = null;

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: jest.fn(),
    push: mockPush,
  }),
}));

jest.mock('@/store', () => ({
  useStore: () => ({
    state: { dokumente: [] },
    dispatch: jest.fn(),
    storeHydrated: true,
  }),
}));

jest.mock('@/providers/AuthContext', () => ({
  useAuth: () => ({
    user: { isGuest: false },
    loading: false,
    loginWithGoogle: jest.fn(),
  }),
}));

jest.mock('@/hooks/useT', () => ({
  useT: () => ({ t: (key: string) => key }),
}));

jest.mock('@/services/guestLimitService', () => ({
  canAddDocument: jest.fn(async () => true),
  recordDocument: jest.fn(async () => undefined),
}));

jest.mock('@/services/androidShareIntentBridge', () => ({
  getPendingAndroidShareUris: () => mockGetPendingAndroidShareUris(),
  getPendingNativeAndroidShareUris: jest.fn(async () => []),
  removeBufferedUri: jest.fn(),
  subscribeAndroidShareIntents: (cb: (uris: string[]) => void) => {
    shareIntentListener = cb;
    return mockSubscribeAndroidShareIntents(cb);
  },
}));

jest.mock('@/services/ShareUploadService', () => ({
  normaliseSharedUri: jest.fn(async (uri: string) => uri),
  extractFileNameFromUri: jest.fn(() => 'test.pdf'),
  detectFileType: jest.fn(() => 'pdf'),
}));

jest.mock('@/services/pendingShareUpload', () => ({
  setPendingSharedAsset: (...args: unknown[]) => mockSetPendingSharedAsset(...args),
}));

describe('useShareHandler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    shareIntentListener = null;
    jest.spyOn(Linking, 'getInitialURL').mockResolvedValue(null);
    mockGetPendingAndroidShareUris.mockResolvedValue(['file:///cache/share.pdf']);
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  function renderHook() {
    const ref: { current: ReturnType<typeof useShareHandler> | null } = { current: null };
    function Harness() {
      ref.current = useShareHandler();
      return null;
    }
    let renderer: TestRenderer.ReactTestRenderer;
    act(() => {
      renderer = TestRenderer.create(<Harness />);
    });
    return { ref, renderer: renderer! };
  }

  it('hands off the shared asset to Kamera instead of processing it directly', async () => {
    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

    expect(mockSetPendingSharedAsset).toHaveBeenCalledWith({
      uri: 'file:///cache/share.pdf',
      name: 'test.pdf',
      mimeType: 'application/pdf',
      source: 'file',
      displayName: 'test.pdf',
      previewUri: undefined,
    });
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/Kamera');
  });

  it('cancel does not hand off or navigate', async () => {
    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    act(() => {
      ref.current?.dismissShare();
    });

    expect(mockSetPendingSharedAsset).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('allows the same URI to be shared again after cancel', async () => {
    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');

    act(() => {
      ref.current?.dismissShare();
    });

    await act(async () => {
      shareIntentListener?.(['file:///cache/share.pdf']);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');
  });

  it('allows the same URI to be shared again after analyze starts', async () => {
    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

    expect(mockSetPendingSharedAsset).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith('/(tabs)/Kamera');

    await act(async () => {
      shareIntentListener?.(['file:///cache/share.pdf']);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');
  });

  it('dedupes duplicate native warm events within the same batch', async () => {
    mockGetPendingAndroidShareUris.mockResolvedValue([]);

    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      shareIntentListener?.(['file:///cache/share.pdf', 'file:///cache/share.pdf']);
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');
  });
});
