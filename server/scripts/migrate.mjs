#!/usr/bin/env node
/**
 * Скрипт для применения миграций Prisma в Docker окружении
 * Использует pg напрямую для применения SQL миграций
 */

import { Pool } from 'pg';
import { readdir, readFile } from 'fs/promises';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required');
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
});

async function createMigrationsTable() {
  const query = `
    CREATE TABLE IF NOT EXISTS _prisma_migrations (
      id VARCHAR(36) PRIMARY KEY,
      checksum VARCHAR(64) NOT NULL,
      finished_at TIMESTAMPTZ,
      migration_name VARCHAR(255) NOT NULL,
      logs TEXT,
      rolled_back_at TIMESTAMPTZ,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      applied_steps_count INTEGER NOT NULL DEFAULT 0
    );
  `;
  
  try {
    await pool.query(query);
    console.log('✅ Migrations table ready');
  } catch (error) {
    console.error('❌ Failed to create migrations table:', error);
    throw error;
  }
}

async function isMigrationApplied(migrationName) {
  const result = await pool.query(
    'SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = $1',
    [migrationName]
  );
  return parseInt(result.rows[0].count) > 0;
}

async function applyMigration(migrationPath, migrationName) {
  const sql = await readFile(migrationPath, 'utf-8');
  
  try {
    // Применяем миграцию
    await pool.query(sql);
    
    // Регистрируем миграцию
    await pool.query(
      `INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count)
       VALUES (gen_random_uuid()::text, $1, NOW(), $2, NOW(), 1)`,
      [Buffer.from(sql).toString('base64').substring(0, 64), migrationName]
    );
    
    console.log(`✅ Applied migration: ${migrationName}`);
  } catch (error) {
    console.error(`❌ Failed to apply migration ${migrationName}:`, error);
    throw error;
  }
}

async function runMigrations() {
  try {
    console.log('🔍 Checking database connection...');
    await pool.query('SELECT 1');
    console.log('✅ Database connected');
    
    await createMigrationsTable();
    
    const migrationsDir = join(__dirname, '..', 'prisma', 'migrations');
    const migrationDirs = await readdir(migrationsDir, { withFileTypes: true });
    
    const migrations = migrationDirs
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name)
      .sort(); // Сортируем по имени (timestamp в начале)
    
    console.log(`📦 Found ${migrations.length} migration(s)`);
    
    for (const migration of migrations) {
      const migrationPath = join(migrationsDir, migration, 'migration.sql');
      
      try {
        const applied = await isMigrationApplied(migration);
        
        if (applied) {
          console.log(`⏭️  Skipping already applied migration: ${migration}`);
        } else {
          console.log(`📝 Applying migration: ${migration}`);
          await applyMigration(migrationPath, migration);
        }
      } catch (error) {
        console.error(`❌ Error processing migration ${migration}:`, error);
        throw error;
      }
    }
    
    console.log('✨ All migrations completed successfully!');
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigrations();
