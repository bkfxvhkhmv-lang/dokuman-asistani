import { sqliteTable, text, integer, real, blob } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const documents = sqliteTable('documents', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  status: text('status', { enum: ['pending', 'processing', 'completed', 'failed'] }).notNull(),
  checksum: text('checksum').notNull(),
  version: integer('version').default(1),
  isDeleted: integer('is_deleted', { mode: 'boolean' }).default(false),
  encryptionType: text('encryption_type').default('AES-256'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const documentMetadata = sqliteTable('document_metadata', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  fieldType: text('field_type'), // iban, deadline, total_amount, sender...
  fieldValue: text('field_value'),
  fieldValueEncrypted: text('field_value_encrypted'),
  fieldValueHash: text('field_value_hash'), // searchable hash
  confidenceScore: real('confidence_score'),
  isHumanVerified: integer('is_human_verified', { mode: 'boolean' }).default(false),
  embedding: blob('embedding'), // vector için
  metadataJson: text('metadata_json', { mode: 'json' }),
});

export const documentEvents = sqliteTable('document_events', {
  id: text('id').primaryKey(),
  documentId: text('document_id').references(() => documents.id, { onDelete: 'cascade' }),
  eventName: text('event_name'),
  payload: text('payload', { mode: 'json' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const schema = { documents, documentMetadata, documentEvents };
