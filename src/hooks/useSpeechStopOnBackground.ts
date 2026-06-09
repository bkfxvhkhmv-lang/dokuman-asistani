import { useEffect } from 'react';
import { AppState } from 'react-native';
import * as Speech from 'expo-speech';

/** Uygulama arka plana geçince tüm vorlesen'i durdur (TTS sızması önlenir). */
export function useSpeechStopOnBackground() {
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'background' && state !== 'inactive') return;
      void Speech.stop();
    });
    return () => sub.remove();
  }, []);
}
