import * as Speech from 'expo-speech';
import { SpeechRecognizer } from './SpeechRecognizer';
import type { VoiceCommand, VoiceCommandResult, VoiceEngineConfig } from '../types';

interface CommandPattern {
  command: VoiceCommand;
  patterns: RegExp[];
  feedback: string;
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    command: 'capture',
    patterns: [
      /\b(scan|tara|scannen|aufnehmen|foto|fotos?|kamera|capture)\b/i,
    ],
    feedback: 'Scannen wird gestartet.',
  },
  {
    command: 'save',
    patterns: [
      /\b(speicher|save|kaydet|sichern|simpel|simpeln)\b/i,
    ],
    feedback: 'Dokument wird gespeichert.',
  },
  {
    command: 'pdf',
    patterns: [
      /\b(pdf|erstell|erzeugen|exportier|export|PDF\s+erstellen)\b/i,
    ],
    feedback: 'PDF wird erstellt.',
  },
  {
    command: 'rotate',
    patterns: [
      /\b(dreh|rotier|rotate|cevir|döndür)\b/i,
    ],
    feedback: 'Bild wird gedreht.',
  },
  {
    command: 'enhance',
    patterns: [
      /\b(verbesser|enhance|optimier|filter|schärfer|kontrast)\b/i,
    ],
    feedback: 'Bildverbesserung wird angewendet.',
  },
  {
    command: 'cancel',
    patterns: [
      /\b(abbrech|cancel|stop|dur|iptal|beend)\b/i,
    ],
    feedback: 'Abgebrochen.',
  },
];

export class VoiceCommandEngine {
  private recognizer: SpeechRecognizer;
  private config: VoiceEngineConfig;
  private isListening = false;

  constructor(config: VoiceEngineConfig = {}) {
    this.config = { feedbackEnabled: true, ...config };
    this.recognizer = new SpeechRecognizer(config);
  }

  async hasPermission(): Promise<boolean> {
    return this.recognizer.requestPermission();
  }

  async listenForCommand(): Promise<VoiceCommandResult> {
    if (this.isListening) {
      return { command: 'unknown', transcript: '', confidence: 0 };
    }

    this.isListening = true;
    try {
      await this.recognizer.start();
      // Listen for max 5 seconds
      await new Promise(resolve => setTimeout(resolve, 5000));
      const result = await this.recognizer.stop();
      return this.parseCommand(result.transcript, result.confidence);
    } catch {
      return { command: 'unknown', transcript: '', confidence: 0 };
    } finally {
      this.isListening = false;
    }
  }

  async startListening(): Promise<void> {
    if (this.isListening) return;
    this.isListening = true;
    await this.recognizer.start();
  }

  async stopListening(): Promise<VoiceCommandResult> {
    if (!this.isListening) {
      return { command: 'unknown', transcript: '', confidence: 0 };
    }
    this.isListening = false;
    const result = await this.recognizer.stop();
    return this.parseCommand(result.transcript, result.confidence);
  }

  async cancelListening(): Promise<void> {
    this.isListening = false;
    await this.recognizer.cancel();
  }

  parseCommand(transcript: string, recognitionConfidence: number): VoiceCommandResult {
    const lower = transcript.toLowerCase().trim();
    if (!lower) {
      return { command: 'unknown', transcript, confidence: 0 };
    }

    for (const { command, patterns, feedback } of COMMAND_PATTERNS) {
      if (patterns.some(p => p.test(lower))) {
        if (this.config.feedbackEnabled) {
          Speech.speak(feedback, { language: this.config.language ?? 'de-DE', rate: 1.1 });
        }
        return {
          command,
          transcript: lower,
          confidence: Math.max(0.7, recognitionConfidence),
          rawTranscript: transcript,
        };
      }
    }

    return { command: 'unknown', transcript: lower, confidence: recognitionConfidence };
  }

  get listening(): boolean {
    return this.isListening;
  }
}
