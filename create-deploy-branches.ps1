# PowerShell скрипт для создания отдельных веток для Frontend и Backend деплоя

Write-Host "🚀 Создание веток для деплоя VideoMeet" -ForegroundColor Cyan
Write-Host "======================================" -ForegroundColor Cyan

# Проверка что мы в git репозитории
try {
    git rev-parse --git-dir 2>&1 | Out-Null
} catch {
    Write-Host "❌ Ошибка: Это не git репозиторий!" -ForegroundColor Red
    Write-Host "Инициализируйте git: git init" -ForegroundColor Yellow
    exit 1
}

# Получаем текущую ветку
$currentBranch = git branch --show-current
Write-Host "📍 Текущая ветка: $currentBranch" -ForegroundColor Green

# Проверка чистоты рабочей директории
$gitStatus = git status --porcelain

if ($gitStatus) {
    Write-Host ""
    Write-Host "⚠️  У вас есть незакоммиченные изменения!" -ForegroundColor Yellow
    $response = Read-Host "Хотите зафиксировать их перед созданием веток? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git add .
        $commitMsg = Read-Host "Введите commit message"
        git commit -m $commitMsg
        Write-Host "✅ Изменения зафиксированы" -ForegroundColor Green
    } else {
        Write-Host "❌ Прервано. Зафиксируйте изменения и запустите скрипт снова." -ForegroundColor Red
        exit 1
    }
}

Write-Host ""
Write-Host "📦 Создание ветки для Frontend деплоя..." -ForegroundColor Cyan

# Проверка существования ветки frontend-deploy
$frontendBranchExists = git branch --list frontend-deploy

if ($frontendBranchExists) {
    Write-Host "⚠️  Ветка 'frontend-deploy' уже существует" -ForegroundColor Yellow
    $response = Read-Host "Хотите пересоздать её? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git branch -D frontend-deploy
        git checkout -b frontend-deploy
        git push -f origin frontend-deploy
        Write-Host "✅ Ветка 'frontend-deploy' пересоздана" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Пропускаем создание frontend-deploy" -ForegroundColor Gray
    }
} else {
    git checkout -b frontend-deploy
    git push -u origin frontend-deploy
    Write-Host "✅ Ветка 'frontend-deploy' создана и отправлена в remote" -ForegroundColor Green
}

# Возврат в исходную ветку
git checkout $currentBranch

Write-Host ""
Write-Host "📦 Создание ветки для Backend деплоя..." -ForegroundColor Cyan

# Проверка существования ветки backend-deploy
$backendBranchExists = git branch --list backend-deploy

if ($backendBranchExists) {
    Write-Host "⚠️  Ветка 'backend-deploy' уже существует" -ForegroundColor Yellow
    $response = Read-Host "Хотите пересоздать её? (y/n)"
    
    if ($response -eq 'y' -or $response -eq 'Y') {
        git branch -D backend-deploy
        git checkout -b backend-deploy
        git push -f origin backend-deploy
        Write-Host "✅ Ветка 'backend-deploy' пересоздана" -ForegroundColor Green
    } else {
        Write-Host "⏭️  Пропускаем создание backend-deploy" -ForegroundColor Gray
    }
} else {
    git checkout -b backend-deploy
    git push -u origin backend-deploy
    Write-Host "✅ Ветка 'backend-deploy' создана и отправлена в remote" -ForegroundColor Green
}

# Возврат в исходную ветку
git checkout $currentBranch

Write-Host ""
Write-Host "======================================" -ForegroundColor Cyan
Write-Host "✨ Готово!" -ForegroundColor Green
Write-Host ""
Write-Host "Созданные ветки:" -ForegroundColor Cyan
git branch -a | Select-String -Pattern "(frontend-deploy|backend-deploy)"

Write-Host ""
Write-Host "📋 Следующие шаги:" -ForegroundColor Yellow
Write-Host ""
Write-Host "1. Frontend деплой на Vercel:" -ForegroundColor Cyan
Write-Host "   - Зайдите на https://vercel.com"
Write-Host "   - Импортируйте ваш репозиторий"
Write-Host "   - Выберите ветку: frontend-deploy (или main)"
Write-Host "   - Root Directory: client"
Write-Host "   - Framework: Vite"
Write-Host ""
Write-Host "2. Backend деплой на Render:" -ForegroundColor Cyan
Write-Host "   - Зайдите на https://render.com"
Write-Host "   - Создайте PostgreSQL и Redis"
Write-Host "   - Создайте Web Service (Docker)"
Write-Host "   - Выберите ветку: backend-deploy (или main)"
Write-Host "   - Root Directory: server"
Write-Host ""
Write-Host "3. Подробные инструкции:" -ForegroundColor Cyan
Write-Host "   - Быстрый старт: .\QUICK-DEPLOY.md"
Write-Host "   - Полная документация: .\DEPLOYMENT.md"
Write-Host ""
Write-Host "Удачного деплоя! 🚀" -ForegroundColor Green
