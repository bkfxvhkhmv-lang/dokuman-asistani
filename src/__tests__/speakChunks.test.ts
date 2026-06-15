import * as Speech from 'expo-speech';
import { splitTextIntoSpeechChunks, speakChunksSequentially } from '@/services/tts/speakChunks';
import type { Dokument } from '@/store';
import { getDocumentSpeechPlainText } from '@/services/tts/documentPlainText';
import { buildCriticalActionsSpeakText } from '@/services/tts/criticalActionsSpeakText';
import { speechUi } from '@/i18n/speechUiStrings';
import { inferSpeechLocaleFromText, ttsLocaleForDetectedLanguage } from '@/services/tts/locales';

jest.mock('expo-speech', () => ({
  stop: jest.fn(async () => undefined),
  speak: jest.fn(),
  getAvailableVoicesAsync: jest.fn(async () => [{ language: 'de-DE' }, { language: 'fr-FR' }, { language: 'tr-TR' }]),
}));

jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(async () => undefined),
  },
}));

describe('splitTextIntoSpeechChunks', () => {
  it('handles short text', () => {
    expect(splitTextIntoSpeechChunks('Hallo Welt.', 200)).toEqual(['Hallo Welt.']);
  });

  it('splits long unbroken prose', () => {
    const long = `${'word '.repeat(300)}`;
    const ch = splitTextIntoSpeechChunks(long, 120);
    expect(ch.length).toBeGreaterThan(1);
    expect(ch.every(c => c.length <= 520)).toBe(true);
  });

  it('cancellation prevents next chunk from starting', async () => {
    const speakMock = Speech.speak as jest.Mock;
    const cancelledRef = { current: false };

    speakMock.mockImplementationOnce((_text: string, opts: { onStopped?: () => void }) => {
      cancelledRef.current = true;
      opts.onStopped?.();
    });

    await speakChunksSequentially(['erste', 'zweite'], {
      language: 'de-DE',
      cancelledRef,
    });

    expect(speakMock).toHaveBeenCalledTimes(1);
    expect(speakMock.mock.calls[0]?.[0]).toBe('erste');
  });
});

describe('getDocumentSpeechPlainText', () => {
  it('prefers rohText', () => {
    const d = { id: '1', rohText: 'AAA' } as unknown as Dokument;
    expect(getDocumentSpeechPlainText(d)).toBe('AAA');
  });

  it('falls back to sorted page ocr', () => {
    const d = {
      id: '1',
      rohText: null,
      pages: [
        { id: 'a', uri: '', order: 2, ocrText: 'second page' },
        { id: 'b', uri: '', order: 1, ocrText: 'first page' },
      ],
    } as Dokument;
    expect(getDocumentSpeechPlainText(d)).toBe('first page\n\nsecond page');
  });
});

describe('buildCriticalActionsSpeakText', () => {
  it('German: includes Frist and Absender warning', () => {
    const d = {
      risiko: 'mittel',
      frist: '2026-01-15',
      aktionen: ['zahlen'],
    } as Dokument;
    const t = buildCriticalActionsSpeakText(d, 'de');
    expect(t).not.toBeNull();
    expect(t).toMatch(/Frist/);
    expect(t).toContain('Absender');
  });

  it('Turkish: includes son tarih and Gönderen warning', () => {
    const d = {
      risiko: 'hoch',
      frist: '2026-06-01',
      aktionen: ['einspruch'],
    } as Dokument;
    const t = buildCriticalActionsSpeakText(d, 'tr');
    expect(t).not.toBeNull();
    expect(t).toMatch(/son tarih/);
    expect(t).toContain('Gönderen');
  });
});

describe('speechUi', () => {
  it('returns DE/TR labels', () => {
    expect(speechUi('de', 'full_listen')).toContain('Volltext');
    expect(speechUi('de', 'stop')).toContain('Anhalten');
    expect(speechUi('tr', 'full_listen')).toContain('Belgeyi dinle');
    expect(speechUi('tr', 'stop')).toContain('Durdur');
  });
});

describe('inferSpeechLocaleFromText', () => {
  it('detects French text', () => {
    expect(inferSpeechLocaleFromText('Bonjour Madame, veuillez payer la facture.', 'de-DE')).toBe('fr-FR');
  });

  it('detects German text', () => {
    expect(inferSpeechLocaleFromText('Sehr geehrte Damen und Herren, bitte zahlen Sie den Betrag.', 'en-US')).toBe('de-DE');
  });

  it('detects Turkish text', () => {
    expect(inferSpeechLocaleFromText('Sayın kullanıcı, ödeme için son tarih yarındır.', 'de-DE')).toBe('tr-TR');
  });

  it('falls back when no signal is found', () => {
    expect(inferSpeechLocaleFromText('12345 ###', 'en-US')).toBe('en-US');
  });
});

describe('ttsLocaleForDetectedLanguage', () => {
  it('maps German detected language to de-DE', () => {
    expect(ttsLocaleForDetectedLanguage('de', 'en-US')).toBe('de-DE');
  });

  it('maps French detected language to fr-FR', () => {
    expect(ttsLocaleForDetectedLanguage('fr', 'de-DE')).toBe('fr-FR');
  });

  it('falls back when detected language is missing', () => {
    expect(ttsLocaleForDetectedLanguage(undefined, 'en-US')).toBe('en-US');
  });
});
