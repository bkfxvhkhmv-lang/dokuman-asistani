import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Alert, Linking } from 'react-native';
import { useShareHandler } from '@/hooks/useShareHandler';

const mockReplace = jest.fn();
const mockPush = jest.fn();
const mockDispatch = jest.fn();
const mockProcessSharedFile = jest.fn();
const mockGetPendingAndroidShareUris = jest.fn();
const mockSubscribeAndroidShareIntents = jest.fn(() => jest.fn());
const mockRecordDocument = jest.fn(async () => undefined);
let shareIntentListener: ((uris: string[]) => void) | null = null;
let mockDocuments = [
  { id: 'existing-local-doc', v4DocId: 'remote-existing-doc', gelesen: false },
];

jest.mock('expo-router', () => ({
  useRouter: () => ({
    replace: mockReplace,
    push:    mockPush,
  }),
}));

jest.mock('@/store', () => ({
  useStore: () => ({
    state: {
      dokumente: mockDocuments,
    },
    dispatch: mockDispatch,
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
  recordDocument: () => mockRecordDocument(),
}));

jest.mock('@/services/androidShareIntentBridge', () => ({
  getPendingAndroidShareUris: () => mockGetPendingAndroidShareUris(),
  subscribeAndroidShareIntents: (cb: (uris: string[]) => void) => {
    shareIntentListener = cb;
    return mockSubscribeAndroidShareIntents(cb);
  },
}));

jest.mock('@/services/ShareUploadService', () => ({
  processSharedFile: (...args: unknown[]) => mockProcessSharedFile(...args),
  normaliseSharedUri: jest.fn(async (uri: string) => uri),
  extractFileNameFromUri: jest.fn(() => 'test.pdf'),
}));

describe('useShareHandler', () => {
  function mockUseStoreState(dokumente: typeof mockDocuments) {
    mockDocuments = dokumente;
  }

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    shareIntentListener = null;
    mockDocuments = [
      { id: 'existing-local-doc', v4DocId: 'remote-existing-doc', gelesen: false },
    ];
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

  it('navigates new share imports to detail/processing flow', async () => {
    mockProcessSharedFile.mockResolvedValue({
      dokument: { id: 'new-local-doc' },
      rawText: 'text',
    });

    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(ref.current?.pendingShare?.uri).toBe('file:///cache/share.pdf');

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

    // Navigation is deferred by setTimeout(0) to let ADD_DOKUMENT commit first.
    act(() => { jest.runAllTimers(); });

    expect(mockDispatch).toHaveBeenCalledWith({
      type: 'ADD_DOKUMENT',
      payload: { id: 'new-local-doc' },
    });
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/detail',
      params: { dokId: 'new-local-doc', tab: 'analiz' },
    });
  });

  it('navigates duplicate share imports to the existing document', async () => {
    mockProcessSharedFile.mockImplementation(
      async (
        _uri: string,
        _docs: unknown[],
        _dispatch: unknown,
        options?: { onUploaded?: (result: { duplicate: boolean; existingDocumentId: string | null; remoteDocId: string }) => void },
      ) => {
        options?.onUploaded?.({
          remoteDocId: 'remote-existing-doc',
          duplicate: true,
          existingDocumentId: 'remote-existing-doc',
        });
        return {
          dokument: { id: 'new-local-doc' },
          rawText: 'text',
        };
      },
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

    expect(alertSpy).toHaveBeenCalledWith('share.confirm.title', 'ocr.upload.duplicate_toast');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/detail',
      params: { dokId: 'existing-local-doc', tab: 'ozet' },
    });
  });

  it('navigates duplicate processing documents to the processing tab', async () => {
    mockProcessSharedFile.mockImplementation(
      async (
        _uri: string,
        _docs: unknown[],
        _dispatch: unknown,
        options?: { onUploaded?: (result: { duplicate: boolean; existingDocumentId: string | null; remoteDocId: string }) => void },
      ) => {
        options?.onUploaded?.({
          remoteDocId: 'remote-existing-doc',
          duplicate: true,
          existingDocumentId: 'remote-existing-doc',
        });
        return {
          dokument: { id: 'new-local-doc' },
          rawText: 'text',
        };
      },
    );
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

    mockUseStoreState([
      { id: 'existing-local-doc', v4DocId: 'remote-existing-doc', v4JobStatus: 'processing', gelesen: false },
    ]);

    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

    expect(alertSpy).toHaveBeenCalledWith('share.confirm.title', 'ocr.upload.duplicate_toast');
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: '/detail',
      params: { dokId: 'existing-local-doc', tab: 'analiz' },
    });
  });

  it('allows the same URI to be shared again after cancel', async () => {
    mockProcessSharedFile.mockResolvedValue({
      dokument: { id: 'new-local-doc' },
      rawText: 'text',
    });

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
    mockProcessSharedFile.mockResolvedValue({
      dokument: { id: 'new-local-doc' },
      rawText: 'text',
    });

    const { ref } = renderHook();

    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
    });

    await act(async () => {
      await ref.current?.confirmAnalyse();
    });

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
