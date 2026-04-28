import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import type { CloudSyncProvider, CloudUploadInput, CloudUploadResult, CloudRemoteFile } from '../types';

const CLIENT_ID = process.env.EXPO_PUBLIC_DROPBOX_CLIENT_ID ?? '';
const TOKEN_KEY = 'briefpilot_dropbox_token';
const FOLDER = '/BriefPilot';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://www.dropbox.com/oauth2/authorize',
  tokenEndpoint: 'https://api.dropboxapi.com/oauth2/token',
};

export class DropboxProvider implements CloudSyncProvider {
  id = 'dropbox' as const;
  label = 'Dropbox';

  async isAvailable(): Promise<boolean> {
    return !!CLIENT_ID;
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    return !!token;
  }

  async authenticate(): Promise<boolean> {
    if (!CLIENT_ID) return false;

    const redirectUri = AuthSession.makeRedirectUri({ scheme: 'briefpilot' });

    const request = new AuthSession.AuthRequest({
      clientId: CLIENT_ID,
      redirectUri,
      scopes: ['files.content.write', 'files.content.read'],
      usePKCE: true,
      extraParams: {
        token_access_type: 'offline',
      },
    });

    const result = await request.promptAsync(DISCOVERY);
    if (result.type !== 'success' || !result.params.code) return false;

    const tokenRes = await fetch(DISCOVERY.tokenEndpoint!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: result.params.code,
        grant_type: 'authorization_code',
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        code_verifier: request.codeVerifier ?? '',
      }).toString(),
    });

    const data = await tokenRes.json();
    if (!data.access_token) return false;

    await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
    return true;
  }

  async signOut(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  }

  async uploadDocument(input: CloudUploadInput): Promise<CloudUploadResult> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) throw new Error('Dropbox: nicht authentifiziert');

    const folder = input.folderName ?? FOLDER;
    const remotePath = `${folder}/${input.fileName}`;
    const fileBase64 = await FileSystem.readAsStringAsync(input.localUri, {
      encoding: 'base64',
    });
    const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

    const res = await fetch('https://content.dropboxapi.com/2/files/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
        'Dropbox-API-Arg': JSON.stringify({
          path: remotePath,
          mode: 'add',
          autorename: true,
          mute: false,
        }),
      },
      body: bytes,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Dropbox Upload Fehler: ${res.status} — ${err}`);
    }

    const data = await res.json();
    return {
      provider: this.id,
      remoteId: data.id ?? remotePath,
      uploadedAt: new Date().toISOString(),
    };
  }

  async listUploads(): Promise<CloudRemoteFile[]> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return [];

    const res = await fetch('https://api.dropboxapi.com/2/files/list_folder', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ path: FOLDER, limit: 50 }),
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.entries ?? []).map((e: any) => ({
      id: e.id,
      name: e.name,
      createdAt: e.server_modified,
      sizeBytes: e.size,
    }));
  }
}
