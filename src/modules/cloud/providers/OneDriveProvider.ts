import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import type { CloudSyncProvider, CloudUploadInput, CloudUploadResult, CloudRemoteFile } from '../types';

const CLIENT_ID = process.env.EXPO_PUBLIC_ONEDRIVE_CLIENT_ID ?? '';
const TOKEN_KEY = 'briefpilot_onedrive_token';
const FOLDER_NAME = 'BriefPilot';

const DISCOVERY: AuthSession.DiscoveryDocument = {
  authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
  tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
};

const GRAPH = 'https://graph.microsoft.com/v1.0/me/drive';

export class OneDriveProvider implements CloudSyncProvider {
  id = 'onedrive' as const;
  label = 'OneDrive';

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
      scopes: ['files.readwrite', 'offline_access'],
      responseType: AuthSession.ResponseType.Code,
    });

    const result = await request.promptAsync(DISCOVERY);
    if (result.type !== 'success' || !result.params.code) return false;

    const tokenRes = await fetch(DISCOVERY.tokenEndpoint!, {
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
    if (!token) throw new Error('OneDrive: nicht authentifiziert');

    const folder = input.folderName ?? FOLDER_NAME;
    await this.ensureFolder(token, folder);

    const fileBase64 = await FileSystem.readAsStringAsync(input.localUri, {
      encoding: 'base64',
    });
    const bytes = Uint8Array.from(atob(fileBase64), c => c.charCodeAt(0));

    // OneDrive simple upload (< 4MB)
    const uploadUrl = `${GRAPH}/root:/${folder}/${input.fileName}:/content`;
    const res = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': input.mimeType ?? 'application/pdf',
      },
      body: bytes,
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`OneDrive Upload Fehler: ${res.status} — ${err}`);
    }

    const data = await res.json();
    return {
      provider: this.id,
      remoteId: data.id,
      remoteUrl: data.webUrl,
      uploadedAt: new Date().toISOString(),
    };
  }

  async listUploads(): Promise<CloudRemoteFile[]> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) return [];

    const res = await fetch(`${GRAPH}/root:/${FOLDER_NAME}:/children?$select=id,name,webUrl,createdDateTime,size&$top=50`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return [];
    const data = await res.json();

    return (data.value ?? []).map((f: any) => ({
      id: f.id,
      name: f.name,
      url: f.webUrl,
      createdAt: f.createdDateTime,
      sizeBytes: f.size,
    }));
  }

  private async ensureFolder(token: string, folderName: string): Promise<void> {
    const checkRes = await fetch(`${GRAPH}/root:/${folderName}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (checkRes.ok) return;

    await fetch(`${GRAPH}/root/children`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'ignore',
      }),
    });
  }
}
