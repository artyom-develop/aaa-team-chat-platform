#!/bin/bash
# Скрипт для создания отдельных веток для Frontend и Backend деплоя

echo "🚀 Создание веток для деплоя VideoMeet"
echo "======================================"

# Проверка что мы в git репозитории
if ! git rev-parse --git-dir > /dev/null 2>&1; then
    echo "❌ Ошибка: Это не git репозиторий!"
    echo "Инициализируйте git: git init"
    exit 1
fi

# Получаем текущую ветку
CURRENT_BRANCH=$(git branch --show-current)
echo "📍 Текущая ветка: $CURRENT_BRANCH"

# Проверка чистоты рабочей директории
if ! git diff-index --quiet HEAD --; then
    echo ""
    echo "⚠️  У вас есть незакоммиченные изменения!"
    echo "Хотите зафиксировать их перед созданием веток? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git add .
        echo "Введите commit message:"
        read -r commit_msg
        git commit -m "$commit_msg"
        echo "✅ Изменения зафиксированы"
    else
        echo "❌ Прервано. Зафиксируйте изменения и запустите скрипт снова."
        exit 1
    fi
fi

echo ""
echo "📦 Создание ветки для Frontend деплоя..."

# Создание ветки frontend-deploy
if git show-ref --verify --quiet refs/heads/frontend-deploy; then
    echo "⚠️  Ветка 'frontend-deploy' уже существует"
    echo "Хотите пересоздать её? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git branch -D frontend-deploy
        git checkout -b frontend-deploy
        git push -f origin frontend-deploy
        echo "✅ Ветка 'frontend-deploy' пересоздана"
    else
        echo "⏭️  Пропускаем создание frontend-deploy"
    fi
else
    git checkout -b frontend-deploy
    git push -u origin frontend-deploy
    echo "✅ Ветка 'frontend-deploy' создана и отправлена в remote"
fi

# Возврат в исходную ветку
git checkout "$CURRENT_BRANCH"

echo ""
echo "📦 Создание ветки для Backend деплоя..."

# Создание ветки backend-deploy
if git show-ref --verify --quiet refs/heads/backend-deploy; then
    echo "⚠️  Ветка 'backend-deploy' уже существует"
    echo "Хотите пересоздать её? (y/n)"
    read -r response
    
    if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]; then
        git branch -D backend-deploy
        git checkout -b backend-deploy
        git push -f origin backend-deploy
        echo "✅ Ветка 'backend-deploy' пересоздана"
    else
        echo "⏭️  Пропускаем создание backend-deploy"
    fi
else
    git checkout -b backend-deploy
    git push -u origin backend-deploy
    echo "✅ Ветка 'backend-deploy' создана и отправлена в remote"
fi

# Возврат в исходную ветку
git checkout "$CURRENT_BRANCH"

echo ""
echo "======================================"
echo "✨ Готово!"
echo ""
echo "Созданные ветки:"
git branch -a | grep -E '(frontend-deploy|backend-deploy)'

echo ""
echo "📋 Следующие шаги:"
echo ""
echo "1. Frontend деплой на Vercel:"
echo "   - Зайдите на https://vercel.com"
echo "   - Импортируйте ваш репозиторий"
echo "   - Выберите ветку: frontend-deploy (или main)"
echo "   - Root Directory: client"
echo "   - Framework: Vite"
echo ""
echo "2. Backend деплой на Render:"
echo "   - Зайдите на https://render.com"
echo "   - Создайте PostgreSQL и Redis"
echo "   - Создайте Web Service (Docker)"
echo "   - Выберите ветку: backend-deploy (или main)"
echo "   - Root Directory: server"
echo ""
echo "3. Подробные инструкции:"
echo "   - Быстрый старт: ./QUICK-DEPLOY.md"
echo "   - Полная документация: ./DEPLOYMENT.md"
echo ""
echo "Удачного деплоя! 🚀"
