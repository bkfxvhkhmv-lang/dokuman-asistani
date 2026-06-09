import type { ReplyTemplate } from '@/features/reply-assistant/domain/types';
import { germanMvpReplyTemplates } from './de';

const registry: readonly ReplyTemplate[] = Object.freeze([...germanMvpReplyTemplates]);

export function getReplyTemplateById(id: string): ReplyTemplate | undefined {
  return registry.find(t => t.id === id);
}

export function getReplyTemplatesByCategory(category: string): ReplyTemplate[] {
  return registry.filter(t => t.category === category);
}

export function getAllReplyTemplates(): readonly ReplyTemplate[] {
  return registry;
}

export function hasReplyTemplate(id: string): boolean {
  return registry.some(t => t.id === id);
}
