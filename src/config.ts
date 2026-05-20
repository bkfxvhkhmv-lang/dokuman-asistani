import Constants from 'expo-constants';

interface EnvConfig {
  API_BASE:     string;
  OCR_MVP_BASE: string;
}

const ENV: Record<string, EnvConfig> = {
  development: {
    API_BASE:     'http://10.0.2.2:8000/api/v4',
    OCR_MVP_BASE: 'http://127.0.0.1:8000',        // iOS Simulator
  },
  device: {
    API_BASE:     'http://192.168.0.93:8000/api/v4',
    OCR_MVP_BASE: 'http://192.168.0.93:8000',      // Fiziksel cihaz: Mac LAN IP
  },
  beta: {
    API_BASE:     'https://api.briefpilot.de/api/v4',
    OCR_MVP_BASE: 'https://api.briefpilot.app',
  },
  production: {
    API_BASE:     'https://api.briefpilot.de/api/v4',
    OCR_MVP_BASE: 'https://api.briefpilot.app',
  },
};

const appEnv = (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'development';
const cfg = ENV[appEnv] ?? ENV.development;

export const API_BASE:     string = cfg.API_BASE;
export const OCR_MVP_BASE: string = cfg.OCR_MVP_BASE;
