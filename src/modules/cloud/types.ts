export interface CloudSyncProvider {
  id: string;
  label: string;
  isAvailable(): Promise<boolean>;
  isAuthenticated(): Promise<boolean>;
  authenticate(): Promise<boolean>;
  signOut(): Promise<void>;
  uploadDocument(document: CloudUploadInput): Promise<CloudUploadResult>;
  listUploads(): Promise<CloudRemoteFile[]>;
  /**
   * S6 — Klasör altı listesi (drive.file kapsamı içinde görünen klasör kimliği).
   * `null`: varsayılan uygulama kök klasörü. Desteklemeyen sağlayıcılar [] döner.
   */
  listFolderChildren?(parentId: string | null): Promise<CloudFolderChild[]>;
}

export interface CloudUploadInput {
  localUri: string;       // local file URI
  fileName: string;       // remote file name (e.g. "invoice_001.pdf")
  mimeType?: string;
  folderName?: string;    // optional subfolder, default "BriefPilot"
}

export interface CloudUploadResult {
  provider: string;
  remoteId: string;
  remoteUrl?: string;
  uploadedAt: string;
}

export interface CloudRemoteFile {
  id: string;
  name: string;
  url?: string;
  createdAt?: string;
  sizeBytes?: number;
}

/** S6 gezinme düğümü — `listFolderChildren` çıktısı. */
export interface CloudFolderChild {
  id: string;
  name: string;
  kind: 'folder' | 'file';
}

export type CloudProviderId = 'dropbox' | 'google-drive' | 'onedrive';
