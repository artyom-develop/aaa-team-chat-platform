#!/usr/bin/env pwsh
# Скрипт автоматической настройки VideoMeet Server

Write-Host "🎥 Начинаем настройку VideoMeet Server..." -ForegroundColor Cyan
Write-Host ""

# Проверка установки Bun
$bunInstalled = $null -ne (Get-Command bun -ErrorAction SilentlyContinue)
if ($bunInstalled) {
    Write-Host "✅ Bun обнаружен" -ForegroundColor Green
    $pkgManager = "bun"
} else {
    Write-Host "⚠️  Bun не установлен. Используем npm..." -ForegroundColor Yellow
    $pkgManager = "npm"
}
Write-Host ""

# Шаг 1: Установка зависимостей
Write-Host "1️⃣ Установка зависимостей..." -ForegroundColor Yellow
& $pkgManager install
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при установке зависимостей" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Зависимости установлены" -ForegroundColor Green
Write-Host ""

# Шаг 2: Настройка .env
Write-Host "2️⃣ Настройка переменных окружения..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "✅ Файл .env создан из .env.example" -ForegroundColor Green
        Write-Host "⚠️  Отредактируйте .env перед запуском!" -ForegroundColor Yellow
    } else {
        Write-Host "❌ Файл .env.example не найден" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "✅ Файл .env уже существует" -ForegroundColor Green
}
Write-Host ""

# Шаг 3: Генерация Prisma Client
Write-Host "3️⃣ Генерация Prisma Client..." -ForegroundColor Yellow
& $pkgManager run prisma:generate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при генерации Prisma Client" -ForegroundColor Red
    exit 1
}
Write-Host "✅ Prisma Client сгенерирован" -ForegroundColor Green
Write-Host ""

# Шаг 4: Применение миграций
Write-Host "4️⃣ Применение миграций к базе данных..." -ForegroundColor Yellow
Write-Host "   Убедитесь, что PostgreSQL запущен!" -ForegroundColor Gray
& $pkgManager run prisma:migrate
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Ошибка при применении миграций" -ForegroundColor Red
    Write-Host "   Проверьте подключение к PostgreSQL в .env" -ForegroundColor Gray
    exit 1
}
Write-Host "✅ Миграции применены" -ForegroundColor Green
Write-Host ""

# Завершение
Write-Host "🎉 Настройка завершена!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Важные заметки:" -ForegroundColor Cyan
Write-Host "   • Убедитесь, что PostgreSQL запущен (порт 5432)" -ForegroundColor White
Write-Host "   • Убедитесь, что Redis запущен (порт 6379)" -ForegroundColor White
Write-Host "   • Отредактируйте .env с вашими настройками" -ForegroundColor White
Write-Host ""
Write-Host "🚀 Запустите сервер командой:" -ForegroundColor Cyan
if ($pkgManager -eq "bun") {
    Write-Host "   bun run dev" -ForegroundColor White
} else {
    Write-Host "   npm run dev" -ForegroundColor White
}
Write-Host ""
Write-Host "📖 API будет доступно по адресу:" -ForegroundColor Cyan
Write-Host "   http://localhost:5000" -ForegroundColor White
Write-Host ""
Write-Host "📡 Socket.io для WebRTC:" -ForegroundColor Cyan
Write-Host "   ws://localhost:5000" -ForegroundColor White
Write-Host ""
