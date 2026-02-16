#!/usr/bin/env pwsh
# Скрипт автоматической настройки проекта

Write-Host "🚀 Начинаем настройку проекта E-Commerce API..." -ForegroundColor Cyan
Write-Host ""

# Шаг 1: Генерация Prisma Client
Write-Host "1️⃣ Генерация Prisma Client..." -ForegroundColor Yellow
npm run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при генерации Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client сгенерирован" -ForegroundColor Green
Write-Host ""

# Шаг 2: Применение миграций
Write-Host "2️⃣ Применение миграций..." -ForegroundColor Yellow
Write-Host "   Когда появится запрос, введите название миграции: add_ecommerce_models" -ForegroundColor Gray
npm run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при применении миграций" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Миграции применены" -ForegroundColor Green
Write-Host ""

# Шаг 3: Переименование seed файла
Write-Host "3️⃣ Подготовка seed файла..." -ForegroundColor Yellow
if (Test-Path "src/database/seed_new.ts") {
    if (Test-Path "src/database/seed.ts") {
        Write-Host "   Создаем резервную копию старого seed.ts..." -ForegroundColor Gray
        Move-Item -Path "src/database/seed.ts" -Destination "src/database/seed.backup.ts" -Force
    }
    Move-Item -Path "src/database/seed_new.ts" -Destination "src/database/seed.ts" -Force
    Write-Host "✅ Seed файл подготовлен" -ForegroundColor Green
} else {
    Write-Host "⚠️ Файл seed_new.ts не найден" -ForegroundColor Yellow
}
Write-Host ""

# Шаг 4: Заполнение базы данных
Write-Host "4️⃣ Заполнение базы тестовыми данными..." -ForegroundColor Yellow
npm run prisma:seed
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при заполнении базы данных" -ForegroundColor Red
    Write-Host "   Возможно, база уже заполнена. Продолжаем..." -ForegroundColor Gray
}
Write-Host "✅ База данных заполнена" -ForegroundColor Green
Write-Host ""

# Завершение
Write-Host "🎉 Настройка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Тестовые аккаунты:" -ForegroundColor Cyan
Write-Host "   Admin: admin@example.com / Admin@12345" -ForegroundColor White
Write-Host "   User:  user@example.com / User@12345" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Запустите проект командой:" -ForegroundColor Cyan
Write-Host "   npm run dev" -ForegroundColor White
Write-Host ""
Write-Host "📖 API Документация будет доступна по адресу:" -ForegroundColor Cyan
Write-Host "   http://localhost:8080/api-docs" -ForegroundColor White
Write-Host ""
