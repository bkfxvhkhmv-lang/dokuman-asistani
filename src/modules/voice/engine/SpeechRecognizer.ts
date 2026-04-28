import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import type { VoiceEngineConfig } from '../types';

export interface RecognitionResult {
  transcript: string;
  confidence: number;
}

export class SpeechRecognizer {
  private recording: Audio.Recording | null = null;
  private config: VoiceEngineConfig;

  constructor(config: VoiceEngineConfig = {}) {
    this.config = { language: 'de-DE', feedbackEnabled: true, ...config };
  }

  async requestPermission(): Promise<boolean> {
    const { status } = await Audio.requestPermissionsAsync();
    return status === 'granted';
  }

  async start(): Promise<void> {
    const granted = await this.requestPermission();
    if (!granted) throw new Error('Mikrofonzugriff verweigert');

    await Audio.setAudioModeAsync({
      allowsRecordingIOS: true,
      playsInSilentModeIOS: true,
    });

    const { recording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    this.recording = recording;
  }

  async stop(): Promise<RecognitionResult> {
    if (!this.recording) {
      return { transcript: '', confidence: 0 };
    }

    await this.recording.stopAndUnloadAsync();
    const uri = this.recording.getURI();
    this.recording = null;

    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });

    if (!uri) return { transcript: '', confidence: 0 };

    if (this.config.transcriptEndpoint) {
      return this.transcribeViaEndpoint(uri);
    }

    // Without a backend, we can't do STT — return empty but non-null
    return { transcript: '', confidence: 0 };
  }

  async cancel(): Promise<void> {
    if (!this.recording) return;
    try {
      await this.recording.stopAndUnloadAsync();
    } catch {}
    this.recording = null;
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
  }

  private async transcribeViaEndpoint(audioUri: string): Promise<RecognitionResult> {
    try {
      const base64 = await FileSystem.readAsStringAsync(audioUri, {
        encoding: 'base64',
      });

      const res = await fetch(this.config.transcriptEndpoint!, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio: base64,
          language: this.config.language,
        }),
      });

      if (!res.ok) return { transcript: '', confidence: 0 };
      const data = await res.json();
      return {
        transcript: data.transcript ?? '',
        confidence: data.confidence ?? 0.5,
      };
    } catch {
      return { transcript: '', confidence: 0 };
    }
  }
}
