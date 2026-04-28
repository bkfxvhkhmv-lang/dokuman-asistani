import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import type { CloudSyncProvider, CloudUploadInput, CloudUploadResult, CloudRemoteFile } from '../types';

const CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? '';
const TOKEN_KEY = 'briefpilot_gdrive_token';
const FOLDER_NAME = 'BriefPilot';

const DISCOVERY = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
};

// Google Drive API v3 endpoints
const DRIVE_FILES = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';

export class GoogleDriveProvider implements CloudSyncProvider {
  id = 'google-drive' as const;
  label = 'Google Drive';

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
      scopes: [
        'https://www.googleapis.com/auth/drive.file',
        'https://www.googleapis.com/auth/drive.appdata',
      ],
      responseType: AuthSession.ResponseType.Code,
      extraParams: { access_type: 'offline', prompt: 'consent' },
    });

    const discoveryDoc: AuthSession.DiscoveryDocument = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
    };

    const result = await request.promptAsync(discoveryDoc);
    if (result.type !== 'success' || !result.params.code) return false;

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: result.params.code,
        client_id: CLIENT_ID,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
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
    if (!token) throw new Error('Google Drive: nicht authentifiziert');

    const folderId = await this.ensureFolder(token, input.folderName ?? FOLDER_NAME);
    const mimeType = input.mimeType ?? 'application/pdf';

    const fileBase64 = await FileSystem.readAsStringAsync(input.localUri, {
      encoding: 'base64',
    });
    const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

    const metadata = JSON.stringify({
      name: input.fileName,
      mimeType,
      parents: folderId ? [folderId] : [],
    });

    const boundary = 'briefpilot_boundary';
    const body = [
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`,
      `--${boundary}\r\nContent-Type: ${mimeType}\r\nContent-Transfer-Encoding: base64\r\n\r\n${fileBase64}\r\n`,
      `--${boundary}--`,
    ].join('');

    const res = await fetch(DRIVE_UPLOAD, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Google Drive Upload Fehler: ${res.status} — ${err}`);
    }

    const data = await res.json();
    return {
      provider: this.id,
      remoteId: data.id,
      remoteUrl: data.webViewLink,
      uploadedAt: new Date().toISOString(),
    };
  }

  async listUploads(): Promise<CloudRemoteFile[]> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return [];

    const q = encodeURIComponent(`name contains '.pdf' and trashed=false`);
    const res = await fetch(`${DRIVE_FILES}?q=${q}&fields=files(id,name,webViewLink,createdTime,size)&pageSize=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.files ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.webViewLink,
      createdAt: f.createdTime,
      sizeBytes: f.size ? (parseInt(f.size, 10) || 0) : undefined,
    }));
  }

  private async ensureFolder(token: string, folderName: string): Promise<string | null> {
    const q = encodeURIComponent(`name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
    const res = await fetch(`${DRIVE_FILES}?q=${q}&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;
    const data = await res.json();
    if (data.files?.length > 0) return data.files[0].id;

    // Create folder
    const createRes = await fetch(DRIVE_FILES, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        mimeType: 'application/vnd.google-apps.folder',
      }),
    });

    if (!createRes.ok) return null;
    const folder = await createRes.json();
    return folder.id ?? null;
  }
}
