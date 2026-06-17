import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

const mockUseCoreScanJob = jest.fn();
const mockUseOcrMvpJob = jest.fn();
const mockPostAcceptedSnapshot = jest.fn();
const mockAnalyzeDocument = jest.fn();

jest.mock('@/hooks/useCoreScanJob', () => ({
  useCoreScanJob: (...args: unknown[]) => mockUseCoreScanJob(...args),
}));

jest.mock('@/hooks/useOcrMvpJob', () => ({
  useOcrMvpJob: (...args: unknown[]) => mockUseOcrMvpJob(...args),
}));

jest.mock('@/services/ocrMvpApi', () => ({
  analyzeDocument: (...args: unknown[]) => mockAnalyzeDocument(...args),
  postAcceptedSnapshot: (...args: unknown[]) => mockPostAcceptedSnapshot(...args),
}));

jest.mock('@/ThemeContext', () => ({
  useTheme: () => ({
    Colors: {
      primary: '#000',
      text: '#111',
      textSecondary: '#666',
      bgCard: '#fff',
      border: '#ccc',
      success: '#0a0',
    },
  }),
}));

jest.mock('@/hooks/useT', () => ({
  useT: () => ({ t: (k: string) => k }),
}));

jest.mock('@/store', () => ({
  useStore: () => ({ state: { dokumente: [] }, dispatch: jest.fn() }),
}));

jest.mock('@/hooks/useGuestLimit', () => ({
  useGuestLimit: () => ({
    gateDocument: jest.fn().mockResolvedValue(true),
    gateOcr: jest.fn().mockResolvedValue(true),
    upgradeVisible: false,
    dismissUpgrade: jest.fn(),
  }),
}));

jest.mock('@/contexts/OfflineBannerContext', () => ({
  useOfflineBannerSuppression: () => ({ setSuppressBanner: jest.fn() }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
}));

jest.mock('expo-keep-awake', () => ({
  activateKeepAwakeAsync: jest.fn().mockResolvedValue(undefined),
  deactivateKeepAwake: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/features/ocr-mvp/domain/ocrBackend', () => ({
  resolveOcrBackend: jest.fn().mockResolvedValue({ base: 'http://127.0.0.1:8000', healthy: true }),
  resetOcrBackendCache: jest.fn(),
}));

jest.mock('@/features/ocr-mvp/components/OcrMvpUploadBox', () => () => null);
jest.mock('@/features/ocr-mvp/components/OcrMvpMultiFileConfirmCard', () => () => null);
jest.mock('@/features/ocr-mvp/components/OcrMvpStatusCard', () => () => null);
jest.mock('@/features/ocr-mvp/components/OcrMvpResultCard', () => () => null);
jest.mock('@/features/auth/GuestUpgradeSheet', () => () => null);
jest.mock('@/components/Icon', () => () => null);
jest.mock('@/components/IconButton', () => ({ children }: { children: React.ReactNode }) => children);

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
}));

import OcrMvpScreen from '@/features/ocr-mvp/OcrMvpScreen';
import { AppState, BackHandler } from 'react-native';

const idleJob = {
  status: 'idle' as const,
  jobId: null,
  result: null,
  error: null,
  errorKind: null,
  startJob: jest.fn(),
  reset: jest.fn(),
};

describe('OcrMvpScreen — core scan hook wire (#147-A2)', () => {
  let appStateSpy: jest.SpyInstance;
  let backHandlerSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCoreScanJob.mockReturnValue(idleJob);
    appStateSpy = jest.spyOn(AppState, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
    backHandlerSpy = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove: jest.fn() } as never);
  });

  afterEach(() => {
    appStateSpy.mockRestore();
    backHandlerSpy.mockRestore();
  });

  it('uses useCoreScanJob instead of useOcrMvpJob', async () => {
    let renderer: TestRenderer.ReactTestRenderer | undefined;
    await act(async () => {
      renderer = TestRenderer.create(<OcrMvpScreen />);
      await Promise.resolve();
    });

    expect(mockUseCoreScanJob).toHaveBeenCalled();
    expect(mockUseOcrMvpJob).not.toHaveBeenCalled();

    await act(async () => {
      renderer?.unmount();
      await Promise.resolve();
    });
  });
});
