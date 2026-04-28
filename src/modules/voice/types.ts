export type VoiceCommand = 'capture' | 'save' | 'pdf' | 'cancel' | 'rotate' | 'enhance' | 'unknown';

export interface VoiceCommandResult {
  command: VoiceCommand;
  transcript: string;
  confidence: number;
  rawTranscript?: string;
}

export interface VoiceEngineConfig {
  language?: string;         // default 'de-DE'
  transcriptEndpoint?: string; // optional STT backend
  feedbackEnabled?: boolean;   // TTS confirmation, default true
}
