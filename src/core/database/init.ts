import { db } from '@/core/database/client';
import { documents, documentMetadata, documentEvents } from '@/core/database/schema';

export async function initDatabase(): Promise<void> {
  // drizzle-orm with expo-sqlite handles table creation via migrations
  // Tables are defined in schema.ts — run `drizzle-kit push` to sync schema
}

export { db, documents, documentMetadata, documentEvents };
