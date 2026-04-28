import { useCallback, useState } from 'react';
import type { ImageEditMode, ImageSession } from '../types';
import type { CaptureResult } from '../../scanner/types';
import { getSharedImageSessionManager } from '../session/ImageSessionManager';

export function useImageSession() {
  const manager = getSharedImageSessionManager();
  const [session, setSession] = useState<ImageSession | null>(null);

  const createSession = useCallback((originalUri: string, filter = 'original') => {
    const next = manager.create(originalUri, filter);
    setSession(next);
    return next;
  }, [manager]);

  const updateSession = useCallback((updates: Partial<ImageSession>) => {
    setSession(prev => (prev ? manager.update(prev, updates) : prev));
  }, [manager]);

  const setEditMode = useCallback((editMode: ImageEditMode) => {
    setSession(prev => (prev ? manager.setEditMode(prev, editMode) : prev));
  }, [manager]);

  const loadSession = useCallback((nextSession: ImageSession | null) => {
    setSession(nextSession);
    return nextSession;
  }, []);

  const createFromCapture = useCallback((capture: CaptureResult) => {
    const next = manager.fromCapture(capture);
    setSession(next);
    return next;
  }, [manager]);

  const addSessionEdit = useCallback((type: ImageSession['edits'][number]['type'], data?: Record<string, unknown>) => {
    setSession(prev => (prev ? manager.addEdit(prev, type, data) : prev));
  }, [manager]);

  const mergeSession = useCallback((nextSession: ImageSession) => {
    setSession(prev => (prev ? manager.update(prev, nextSession) : nextSession));
  }, [manager]);

  const serializeSession = useCallback(() => {
    return session ? JSON.stringify(session) : null;
  }, [session]);

  const applyCropResult = useCallback((croppedUri: string) => {
    setSession(prev => (prev ? manager.applyCrop(prev, croppedUri) : prev));
  }, [manager]);

  const resetSession = useCallback((originalUri?: string) => {
    if (!originalUri) {
      setSession(null);
      return null;
    }
    const next = manager.create(originalUri, 'original');
    setSession(next);
    return next;
  }, [manager]);

  return {
    session,
    setSession,
    createSession,
    createFromCapture,
    loadSession,
    updateSession,
    setEditMode,
    applyCropResult,
    addSessionEdit,
    mergeSession,
    serializeSession,
    resetSession,
  };
}
