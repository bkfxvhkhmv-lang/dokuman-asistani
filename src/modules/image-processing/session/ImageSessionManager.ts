import type { ImageEditMode, ImageSession, ImageSessionEdit } from '../types';
import type { CaptureResult } from '../../scanner/types';

function createSessionId() {
  return `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function createEditId(type: ImageSessionEdit['type']) {
  return `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export class ImageSessionManager {
  create(originalUri: string, filter = 'original'): ImageSession {
    const now = Date.now();
    return {
      id: createSessionId(),
      originalUri,
      finalUri: originalUri,
      activeFilter: filter,
      editMode: 'none',
      rotation: 0,
      edits: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  reset(session: ImageSession): ImageSession {
    return this.create(session.originalUri, 'original');
  }

  applyRotation(session: ImageSession, degrees: number, rotatedUri: string): ImageSession {
    const rotation = ((session.rotation + degrees) % 360 + 360) % 360;
    const rotated = this.update(session, {
      rotatedUri,
      rotation,
      previewUri: undefined,
      enhancedUri: undefined,
      finalUri: rotatedUri,
    });
    return this.addEdit(rotated, 'perspective', { degrees, rotatedUri });
  }

  fromCapture(capture: CaptureResult): ImageSession {
    const baseSession = this.create(capture.originalUri, capture.processing.filter);
    let session = this.update(baseSession, {
      correctedUri: capture.correctedUri,
      enhancedUri: capture.enhancedUri,
      finalUri: capture.finalUri,
      activeFilter: capture.processing.filter,
      quality: capture.qualityMetrics,
    });

    if (capture.correctedUri) {
      session = this.addEdit(session, 'perspective', {
        correctedUri: capture.correctedUri,
      });
    }

    if (capture.processing.filter !== 'original') {
      session = this.addEdit(session, 'filter', {
        filter: capture.processing.filter,
      });
    }

    if (capture.processing.enhancementApplied) {
      session = this.addEdit(session, 'enhancement', {
        enhancedUri: capture.enhancedUri ?? capture.finalUri,
      });
    }

    if (capture.qualityMetrics) {
      session = this.addEdit(session, 'quality', {
        overallScore: capture.qualityMetrics.overallScore,
      });
    }

    return session;
  }

  addEdit(session: ImageSession, type: ImageSessionEdit['type'], data?: Record<string, unknown>): ImageSession {
    const edit: ImageSessionEdit = {
      id: createEditId(type),
      type,
      createdAt: Date.now(),
      data,
    };

    return {
      ...session,
      edits: [...session.edits, edit],
      updatedAt: Date.now(),
    };
  }

  update(session: ImageSession, updates: Partial<ImageSession>): ImageSession {
    return {
      ...session,
      ...updates,
      updatedAt: Date.now(),
    };
  }

  setEditMode(session: ImageSession, editMode: ImageEditMode): ImageSession {
    return this.update(session, { editMode });
  }

  getBaseImageUri(session: ImageSession) {
    return session.croppedUri ?? session.rotatedUri ?? session.correctedUri ?? session.originalUri;
  }

  getPreviewSource(session: ImageSession) {
    return session.previewUri ?? session.enhancedUri ?? session.croppedUri ?? session.rotatedUri ?? session.correctedUri ?? session.originalUri;
  }

  getPreviewBaseUri(session: ImageSession) {
    return this.getBaseImageUri(session);
  }

  getCommittedUri(session: ImageSession) {
    return session.enhancedUri ?? session.croppedUri ?? session.rotatedUri ?? session.correctedUri ?? session.originalUri;
  }

  getFinalSource(session: ImageSession) {
    return this.getCommittedUri(session);
  }

  applyPreview(session: ImageSession, previewUri: string, filter: string): ImageSession {
    return this.update(session, {
      activeFilter: filter,
      previewUri,
    });
  }

  commitFilter(session: ImageSession, filter: string, enhancedUri?: string): ImageSession {
    const nextEnhancedUri = filter === 'original' ? undefined : enhancedUri;
    const nextFinalUri = nextEnhancedUri ?? this.getBaseImageUri(session);

    return this.update(session, {
      activeFilter: filter,
      enhancedUri: nextEnhancedUri,
      previewUri: undefined,
      finalUri: nextFinalUri,
    });
  }

  applyCrop(session: ImageSession, croppedUri: string): ImageSession {
    const croppedSession = this.update(session, {
      croppedUri,
      enhancedUri: undefined,
      previewUri: undefined,
      finalUri: croppedUri,
      editMode: 'none',
    });

    return this.addEdit(croppedSession, 'crop', { croppedUri });
  }
}

let sharedImageSessionManager: ImageSessionManager | null = null;

export function getSharedImageSessionManager() {
  if (!sharedImageSessionManager) {
    sharedImageSessionManager = new ImageSessionManager();
  }
  return sharedImageSessionManager;
}

export function createImageSession(originalUri: string, filter = 'original') {
  return getSharedImageSessionManager().create(originalUri, filter);
}
