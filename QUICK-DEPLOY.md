# 🚀 Быстрый старт деплоя

## Создание отдельных веток для Frontend и Backend

### Зачем нужны отдельные ветки?

- **Vercel** будет деплоить только frontend из ветки `frontend-deploy`
- **Render** будет деплоить только backend из ветки `backend-deploy`
- Это позволяет независимо управлять деплоями каждой части приложения

---

## 📦 Пошаговая инструкция

### Шаг 1: Зафиксируйте текущие изменения

```bash
# Убедитесь что вы в корне проекта
cd c:/Users/User/Desktop/video-service

# Добавьте все новые файлы
git add .

# Зафиксируйте изменения
git commit -m "Add deployment configuration files"

# Отправьте в основную ветку
git push origin main
```

---

### Шаг 2: Создайте ветку для Frontend

```bash
# Создайте и переключитесь на ветку frontend
git checkout -b frontend-deploy

# Убедитесь что все файлы на месте
ls client/

# Должны быть:
# - Dockerfile
# - nginx.conf
# - vercel.json
# - .dockerignore
# - .env.production

# Отправьте ветку в репозиторий
git push -u origin frontend-deploy

# Вернитесь в main
git checkout main
```

---

### Шаг 3: Создайте ветку для Backend

```bash
# Создайте и переключитесь на ветку backend
git checkout -b backend-deploy

# Убедитесь что все файлы на месте
ls server/

# Должны быть:
# - Dockerfile
# - render.yaml
# - .dockerignore
# - .env.production

# Отправьте ветку в репозиторий
git push -u origin backend-deploy

# Вернитесь в main
git checkout main
```

---

## 🎯 Деплой на Vercel (Frontend)

### Вариант 1: Через Web UI (Рекомендуется)

1. Перейдите на https://vercel.com
2. Нажмите **"Add New Project"**
3. Выберите ваш репозиторий
4. Настройте:
   - **Root Directory**: `client`
   - **Framework**: Vite
   - **Branch**: `frontend-deploy` (или `main`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Добавьте Environment Variables:
   ```
   VITE_API_URL=https://your-backend.onrender.com
   VITE_SOCKET_URL=https://your-backend.onrender.com
   ```

6. Нажмите **Deploy**

### Вариант 2: Через CLI

```bash
# Установите Vercel CLI
npm install -g vercel

# Перейдите в папку client
cd client

# Залогиньтесь
vercel login

# Деплой
vercel --prod

# Следуйте инструкциям в терминале
```

---

## 🎯 Деплой на Render (Backend)

### Шаг 1: Создайте PostgreSQL базу данных

1. Зайдите на https://render.com
2. Нажмите **New +** → **PostgreSQL**
3. Настройте:
   - **Name**: `videomeet-db`
   - **Database**: `videomeet`
   - **Region**: Frankfurt (или ближайший)
   - **Plan**: Free
4. Создайте базу
5. **Скопируйте Internal Database URL** (понадобится позже)

### Шаг 2: Создайте Redis

1. Нажмите **New +** → **Redis**
2. Настройте:
   - **Name**: `videomeet-redis`
   - **Region**: Frankfurt (тот же что и PostgreSQL)
   - **Plan**: Free
3. Создайте Redis
4. **Скопируйте Internal Connection String**

### Шаг 3: Деплой Backend сервиса

1. Нажмите **New +** → **Web Service**
2. Подключите ваш Git репозиторий
3. Настройте:
   - **Name**: `videomeet-backend`
   - **Region**: Frankfurt
   - **Branch**: `backend-deploy` (или `main`)
   - **Root Directory**: `server`
   - **Environment**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Plan**: Free

4. Добавьте Environment Variables (см. ниже)

5. Нажмите **Create Web Service**

### Переменные окружения для Render:

```bash
NODE_ENV=production
PORT=3000

# Вставьте ваш Internal Database URL из шага 1
DATABASE_URL=postgresql://videomeet_user:password@dpg-xxxxx.frankfurt-postgres.render.com/videomeet

# Вставьте данные Redis из шага 2
REDIS_HOST=red-xxxxx.frankfurt-redis.render.com
REDIS_PORT=6379
REDIS_PASSWORD=xxxxxxxxxxxxxxxx

# Сгенерируйте случайный JWT секрет (используйте команду ниже)
JWT_SECRET=your-super-secret-minimum-32-characters
JWT_EXPIRES_IN=7d

# Укажите URL вашего фронтенда (получите после деплоя на Vercel)
CORS_ORIGIN=https://your-app.vercel.app
```

**Генерация JWT_SECRET:**
```bash
openssl rand -base64 32
# или
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🔄 Обновление URL's после деплоя

### После деплоя Backend на Render:

1. Скопируйте URL вашего backend (например: `https://videomeet-backend.onrender.com`)
2. Обновите переменные окружения на Vercel:
   ```
   VITE_API_URL=https://videomeet-backend.onrender.com
   VITE_SOCKET_URL=https://videomeet-backend.onrender.com
   ```
3. Запустите redeploy на Vercel

### После деплоя Frontend на Vercel:

1. Скопируйте URL вашего фронтенда (например: `https://videomeet-app.vercel.app`)
2. Обновите переменную окружения на Render:
   ```
   CORS_ORIGIN=https://videomeet-app.vercel.app
   ```
3. Render автоматически задеплоит изменения

---

## 🐳 Локальный запуск с Docker

```bash
# Создайте .env файл в корне проекта
cp .env.example .env

# Отредактируйте значения в .env
# (используйте любой текстовый редактор)

# Запустите Docker Compose
docker-compose up -d

# Проверьте что все работает:
# Frontend: http://localhost
# Backend: http://localhost:3000
# API Docs: http://localhost:3000/api-docs

# Просмотр логов
docker-compose logs -f

# Остановка
docker-compose down
```

---

## ✅ Проверка работоспособности

### Vercel Frontend

```bash
# Откройте в браузере
https://your-app.vercel.app

# Проверьте консоль на ошибки (F12 → Console)
# Проверьте Network tab → убедитесь что API запросы работают
```

### Render Backend

```bash
# Проверьте health endpoint
curl https://your-backend.onrender.com/api/health

# Откройте Swagger документацию
https://your-backend.onrender.com/api-docs

# Проверьте логи в Render Dashboard
```

### Docker локально

```bash
# Проверьте статус контейнеров
docker-compose ps

# Все должны быть "Up"

# Тест API
curl http://localhost:3000/api/health

# Тест Frontend
curl http://localhost
```

---

## 🆘 Частые проблемы

### Проблема: "Failed to connect to API"

**Решение:**
- Проверьте что `VITE_API_URL` правильно настроен
- Проверьте что backend деплоится успешно на Render
- Проверьте CORS настройки на backend

### Проблема: "Database connection failed"

**Решение:**
- Используйте **Internal Database URL**, не External
- Убедитесь что формат правильный: `postgresql://user:pass@host/db`
- Проверьте что backend и БД в одном регионе

### Проблема: "Prisma migration failed"

**Решение:**
```bash
# В Render Shell выполните:
bun run prisma:migrate:deploy

# Или добавьте в startCommand:
bun run prisma:migrate:deploy && bun run start
```

### Проблема: WebSocket не подключается

**Решение:**
- Используйте `wss://` для production, не `ws://`
- Убедитесь что `VITE_SOCKET_URL` совпадает с `VITE_API_URL`
- Проверьте CORS на backend

---

## 📝 Чеклист перед деплоем

- [ ] Git репозиторий создан и код закоммичен
- [ ] Создана ветка `frontend-deploy`
- [ ] Создана ветка `backend-deploy`
- [ ] Все Dockerfile'ы на месте
- [ ] vercel.json настроен
- [ ] render.yaml настроен
- [ ] Сгенерирован безопасный JWT_SECRET
- [ ] PostgreSQL база создана на Render
- [ ] Redis создан на Render
- [ ] Environment variables настроены
- [ ] CORS_ORIGIN указывает на правильный домен
- [ ] DATABASE_URL использует Internal URL
- [ ] Проверен build локально

---

## 📚 Полезные команды

### Git

```bash
# Посмотреть текущую ветку
git branch

# Переключиться на ветку
git checkout branch-name

# Создать новую ветку
git checkout -b new-branch-name

# Отправить ветку в репозиторий
git push -u origin branch-name

# Обновить локальную ветку
git pull origin branch-name
```

### Docker

```bash
# Запустить все сервисы
docker-compose up -d

# Остановить все сервисы
docker-compose down

# Просмотр логов
docker-compose logs -f

# Пересборка образов
docker-compose build --no-cache

# Статистика контейнеров
docker stats

# Очистка неиспользуемых ресурсов
docker system prune -a
```

### Render CLI (опционально)

```bash
# Установка
npm install -g render-cli

# Логин
render login

# Просмотр сервисов
render services list

# Просмотр логов
render logs <service-id>
```

---

## 🎓 Дополнительная информация

Подробная документация доступна в файле [DEPLOYMENT.md](./DEPLOYMENT.md)

---

**Удачного деплоя! 🚀**
