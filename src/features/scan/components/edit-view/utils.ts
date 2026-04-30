import type { ImageSession } from '@/modules/image-processing';

export function getSessionUri(session: ImageSession) {
  return session.finalUri ?? session.croppedUri ?? session.correctedUri ?? session.originalUri;
}
