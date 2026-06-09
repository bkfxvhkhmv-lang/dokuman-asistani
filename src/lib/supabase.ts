import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import Constants from 'expo-constants';

function getSupabaseUrl(): string {
  const extra = Constants.expoConfig?.extra as { supabaseUrl?: string } | undefined;
  const fromExtra = (extra?.supabaseUrl ?? '').trim();
  if (fromExtra) return fromExtra;
  const fromEnv = (process.env.EXPO_PUBLIC_SUPABASE_URL ?? '').trim();
  if (fromEnv) return fromEnv;
  return '';
}

function getSupabaseAnonKey(): string {
  const fromEnv = (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '').trim();
  return fromEnv;
}

const supabaseUrl  = getSupabaseUrl();
const supabaseAnon = getSupabaseAnonKey();

if (__DEV__ && (!supabaseUrl || !supabaseAnon)) {
  console.warn('[Supabase] EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY is missing. Auth will not work.');
}

export const supabase = createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnon || 'placeholder', {
  auth: {
    storage:            AsyncStorage,
    autoRefreshToken:   true,
    persistSession:     true,
    detectSessionInUrl: false,
  },
});
