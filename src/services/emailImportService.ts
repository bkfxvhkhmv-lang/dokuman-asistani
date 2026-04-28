import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE } from '../config';
import { authFetch } from './authService';

WebBrowser.maybeCompleteAuthSession();

const GMAIL_CLIENT_ID = 'REPLACE_WITH_GOOGLE_CLIENT_ID';
const GMAIL_TOKEN_KEY = '@bp_gmail_token';

const GMAIL_DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint:         'https://oauth2.googleapis.com/token',
};

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

export interface GmailStatus {
  connected: boolean;
  email?: string;
}

export async function connectGmail(): Promise<{ email: string }> {
  const redirectUri = AuthSession.makeRedirectUri({ scheme: 'briefpilot' });

  const request = new AuthSession.AuthRequest({
    clientId: GMAIL_CLIENT_ID,
    scopes: SCOPES,
    redirectUri,
  });

  const result = await request.promptAsync(GMAIL_DISCOVERY);

  if (result.type !== 'success') {
    throw new Error('Gmail Verbindung abgebrochen.');
  }

  const { code } = result.params;

  const res = await authFetch(`${API_BASE}/sync/email/connect`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider: 'gmail', code, redirectUri }),
  });

  if (!res.ok) throw new Error('Gmail Verbindung fehlgeschlagen');

  const data = await res.json() as { email: string };
  await AsyncStorage.setItem(GMAIL_TOKEN_KEY, JSON.stringify({ connected: true, email: data.email }));
  return data;
}

export async function getGmailStatus(): Promise<GmailStatus> {
  const raw = await AsyncStorage.getItem(GMAIL_TOKEN_KEY);
  return raw ? JSON.parse(raw) : { connected: false };
}

export async function disconnectGmail(): Promise<void> {
  await AsyncStorage.removeItem(GMAIL_TOKEN_KEY);
  await authFetch(`${API_BASE}/sync/email/disconnect`, { method: 'DELETE' });
}

export async function triggerEmailSync(): Promise<unknown> {
  const res = await authFetch(`${API_BASE}/sync/email/import`, { method: 'POST' });
  if (!res.ok) throw new Error('E-Mail Sync fehlgeschlagen');
  return res.json();
}
