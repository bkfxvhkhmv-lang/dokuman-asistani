jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  multiRemove: jest.fn(),
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  GUEST_DOC_LIMIT,
  GUEST_OCR_LIMIT,
  canAddDocument,
  canRunOcr,
  recordDocument,
  recordOcr,
  getCounts,
  clearLimits,
} from '@/services/guestLimitService';

const mockGetItem = AsyncStorage.getItem as jest.Mock;
const mockSetItem = AsyncStorage.setItem as jest.Mock;
const mockMultiRemove = AsyncStorage.multiRemove as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetItem.mockResolvedValue(null);
});

describe('guestLimitService', () => {
  it('allows documents until limit is reached', async () => {
    expect(await canAddDocument()).toBe(true);
    await recordDocument();
    expect(mockSetItem).toHaveBeenCalledWith('@briefpilot_guest_doc_count', '1');

    mockGetItem.mockResolvedValueOnce(String(GUEST_DOC_LIMIT));
    expect(await canAddDocument()).toBe(false);
  });

  it('allows OCR until limit is reached', async () => {
    expect(await canRunOcr()).toBe(true);
    await recordOcr();
    expect(mockSetItem).toHaveBeenCalledWith('@briefpilot_guest_ocr_count', '1');

    mockGetItem.mockResolvedValueOnce(String(GUEST_OCR_LIMIT));
    expect(await canRunOcr()).toBe(false);
  });

  it('returns counts with max values', async () => {
    mockGetItem
      .mockResolvedValueOnce('2')
      .mockResolvedValueOnce('1');
    expect(await getCounts()).toEqual({
      docCount: 2,
      ocrCount: 1,
      docMax: GUEST_DOC_LIMIT,
      ocrMax: GUEST_OCR_LIMIT,
    });
  });

  it('clears stored counters', async () => {
    await clearLimits();
    expect(mockMultiRemove).toHaveBeenCalledWith([
      '@briefpilot_guest_doc_count',
      '@briefpilot_guest_ocr_count',
    ]);
  });
});
