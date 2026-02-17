#!/bin/sh
# Скрипт для применения миграций в Docker контейнере

set -e

echo "Checking database connection..."
until pg_isready -h ${DATABASE_HOST:-postgres} -p ${DATABASE_PORT:-5432} -U ${DATABASE_USER:-postgres}; do
  echo "Waiting for database..."
  sleep 2
done

echo "Database is ready!"

echo "Applying migrations..."

# Проверяем наличие таблицы миграций
psql "${DATABASE_URL}" -c "CREATE TABLE IF NOT EXISTS _prisma_migrations (
  id VARCHAR(36) PRIMARY KEY,
  checksum VARCHAR(64) NOT NULL,
  finished_at TIMESTAMPTZ,
  migration_name VARCHAR(255) NOT NULL,
  logs TEXT,
  rolled_back_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  applied_steps_count INTEGER NOT NULL DEFAULT 0
);" 2>/dev/null || true

# Применяем каждую миграцию если она еще не применена
for migration in /app/prisma/migrations/*/migration.sql; do
  if [ -f "$migration" ]; then
    migration_name=$(basename $(dirname "$migration"))
    echo "Checking migration: $migration_name"
    
    # Проверяем применена ли миграция
    applied=$(psql "${DATABASE_URL}" -tAc "SELECT COUNT(*) FROM _prisma_migrations WHERE migration_name = '$migration_name';")
    
    if [ "$applied" = "0" ]; then
      echo "Applying migration: $migration_name"
      psql "${DATABASE_URL}" -f "$migration"
      
      # Регистрируем миграцию
      psql "${DATABASE_URL}" -c "INSERT INTO _prisma_migrations (id, checksum, finished_at, migration_name, started_at, applied_steps_count) 
        VALUES (gen_random_uuid()::text, '$(md5sum $migration | cut -d' ' -f1)', NOW(), '$migration_name', NOW(), 1);"
      
      echo "Migration $migration_name applied successfully!"
    else
      echo "Migration $migration_name already applied, skipping."
    fi
  fi
done

echo "All migrations applied successfully!"
