import Constants from 'expo-constants';

interface EnvConfig {
  API_BASE: string;
}

const ENV: Record<string, EnvConfig> = {
  development: { API_BASE: 'http://10.0.2.2:8000/api/v4' },
  device:      { API_BASE: 'http://192.168.0.33:8000/api/v4' },
  production:  { API_BASE: 'https://api.briefpilot.de/api/v4' },
};

const appEnv = (Constants.expoConfig?.extra?.APP_ENV as string | undefined) ?? 'development';
export const API_BASE: string = (ENV[appEnv] ?? ENV.development).API_BASE;
