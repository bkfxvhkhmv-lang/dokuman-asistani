import { drizzle } from 'drizzle-orm/expo-sqlite';
import * as SQLite from 'expo-sqlite';
import { schema } from '@/core/database/schema';

export const expoDb = SQLite.openDatabaseSync('briefpilot_v4.db');
export const db = drizzle(expoDb, { schema });

export default db;
