# 🚀 Руководство по деплою VideoMeet

Полное руководство по развертыванию приложения VideoMeet на различных платформах.

## 📋 Оглавление

1. [Обзор архитектуры](#обзор-архитектуры)
2. [Деплой Frontend на Vercel](#деплой-frontend-на-vercel)
3. [Деплой Backend на Render](#деплой-backend-на-render)
4. [Деплой с использованием Docker](#деплой-с-использованием-docker)
5. [Настройка переменных окружения](#настройка-переменных-окружения)
6. [Проверка работоспособности](#проверка-работоспособности)
7. [Решение проблем](#решение-проблем)

---

## 🏗️ Обзор архитектуры

Проект состоит из трех основных частей:

- **Frontend** (React + Vite) → Деплой на **Vercel**
- **Backend** (Node.js + Bun + Express + Socket.IO) → Деплой на **Render**
- **Databases** (PostgreSQL + Redis) → Управляемые сервисы Render

```
┌─────────────┐      ┌─────────────┐      ┌──────────────┐
│   Vercel    │─────>│   Render    │─────>│  PostgreSQL  │
│  (Frontend) │      │  (Backend)  │      │   + Redis    │
└─────────────┘      └─────────────┘      └──────────────┘
```

---

## 🎨 Деплой Frontend на Vercel

### Предварительные требования

- Аккаунт на [Vercel](https://vercel.com)
- Git репозиторий с вашим кодом (GitHub/GitLab/Bitbucket)
- Node.js 18+ установлен локально (для тестирования)

### Шаг 1: Подготовка проекта

1. **Создайте отдельную ветку для frontend** (опционально, но рекомендуется):
   ```bash
   git checkout -b frontend-deploy
   ```

2. **Убедитесь, что файлы созданы**:
   - `client/vercel.json` - конфигурация Vercel
   - `client/.env.production` - продакшн переменные

3. **Локальный тест сборки**:
   ```bash
   cd client
   npm install
   npm run build
   npm run preview
   ```

### Шаг 2: Деплой на Vercel

#### Вариант A: Через веб-интерфейс

1. Перейдите на [vercel.com](https://vercel.com) и войдите
2. Нажмите **"Add New Project"**
3. Импортируйте ваш Git репозиторий
4. Настройте проект:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (важно!)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Добавьте переменные окружения**:
   ```
   VITE_API_URL=https://your-backend-app.onrender.com
   VITE_SOCKET_URL=https://your-backend-app.onrender.com
   ```
   ⚠️ **Важно**: Замените `your-backend-app` на реальный URL вашего backend (получите его после деплоя на Render)

6. Нажмите **"Deploy"**

#### Вариант B: Через Vercel CLI

```bash
# Установка Vercel CLI
npm i -g vercel

# Переход в директорию client
cd client

# Логин в Vercel
vercel login

# Деплой
vercel --prod
```

### Шаг 3: Настройка домена (опционально)

1. В настройках проекта Vercel перейдите в **Domains**
2. Добавьте свой кастомный домен
3. Настройте DNS записи согласно инструкциям Vercel

### Шаг 4: Автоматический деплой

Vercel автоматически создаст CI/CD пайплайн:
- **Production**: деплой из ветки `main`/`master`
- **Preview**: деплой из других веток при создании PR

---

## ⚙️ Деплой Backend на Render

### Предварительные требования

- Аккаунт на [Render](https://render.com)
- Git репозиторий с кодом
- Backend готов к продакшену

### Шаг 1: Подготовка проекта

1. **Создайте отдельную ветку для backend** (опционально):
   ```bash
   git checkout -b backend-deploy
   ```

2. **Проверьте наличие файлов**:
   - `server/Dockerfile` - для Docker деплоя
   - `server/render.yaml` - Blueprint конфигурация
   - `server/.env.production` - шаблон переменных

3. **Локальный тест**:
   ```bash
   cd server
   bun install
   bun run build
   bun run start
   ```

### Шаг 2: Создание баз данных на Render

#### PostgreSQL

1. В дашборде Render нажмите **"New +"** → **"PostgreSQL"**
2. Настройте:
   - **Name**: `videomeet-db`
   - **Database**: `videomeet`
   - **User**: `videomeet_user` (или любое имя)
   - **Region**: выберите ближайший регион
   - **Plan**: Free или Starter
3. Нажмите **"Create Database"**
4. **Сохраните Internal Database URL** - понадобится для backend

#### Redis

1. Нажмите **"New +"** → **"Redis"**
2. Настройте:
   - **Name**: `videomeet-redis`
   - **Region**: тот же, что и PostgreSQL
   - **Plan**: Free
   - **Maxmemory Policy**: `allkeys-lru`
3. Нажмите **"Create Redis"**
4. **Сохраните Redis Internal URL**

### Шаг 3: Деплой Backend

#### Вариант A: Через веб-интерфейс

1. Нажмите **"New +"** → **"Web Service"**
2. Подключите ваш Git репозиторий
3. Настройте:
   - **Name**: `videomeet-backend`
   - **Region**: тот же, что БД
   - **Branch**: `main` или `backend-deploy`
   - **Root Directory**: `server`
   - **Environment**: **Docker**
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.`
   - **Plan**: Free или Starter

4. **Добавьте переменные окружения** (см. секцию ниже)

5. Нажмите **"Create Web Service"**

#### Вариант B: Через Blueprint (render.yaml)

1. Нажмите **"New +"** → **"Blueprint"**
2. Подключите репозиторий
3. Render автоматически обнаружит `server/render.yaml`
4. Проверьте конфигурацию и нажмите **"Apply"**

### Шаг 4: Настройка переменных окружения на Render

В разделе **Environment** добавьте:

#### Обязательные переменные:

```bash
# Node Environment
NODE_ENV=production

# Server
PORT=3000

# Database (используйте Internal Database URL из вашей PostgreSQL)
DATABASE_URL=postgresql://videomeet_user:password@dpg-xxx.frankfurt-postgres.render.com/videomeet

# Redis (используйте Internal Redis URL)
REDIS_HOST=red-xxx.frankfurt-redis.render.com
REDIS_PORT=6379
REDIS_PASSWORD=xxxxx

# JWT (сгенерируйте сложный случайный ключ)
JWT_SECRET=ваш-супер-секретный-ключ-минимум-32-символа
JWT_EXPIRES_IN=7d

# CORS (URL вашего фронтенда на Vercel)
CORS_ORIGIN=https://your-app.vercel.app
```

#### Опциональные переменные:

```bash
# Argon2
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
```

### Шаг 5: Генерация безопасных секретов

```bash
# Генерация JWT_SECRET (используйте один из способов):

# Способ 1: OpenSSL
openssl rand -base64 32

# Способ 2: Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Способ 3: Online генератор
# https://www.random.org/strings/
```

### Шаг 6: Миграция базы данных

После деплоя сервиса:

1. Перейдите в **Shell** вашего Web Service
2. Выполните:
   ```bash
   bun run prisma:migrate:deploy
   ```

Или настройте автоматическую миграцию в команде запуска (уже включено в Dockerfile).

---

## 🐳 Деплой с использованием Docker

### Локальный запуск с Docker Compose

#### Шаг 1: Подготовка окружения

```bash
# Склонируйте репозиторий
git clone <your-repo-url>
cd video-service

# Создайте .env файл из шаблона
cp .env.example .env

# Отредактируйте переменные в .env
nano .env  # или используйте любой редактор
```

#### Шаг 2: Запуск Docker Compose

```bash
# Сборка и запуск всех сервисов
docker-compose up -d

# Просмотр логов
docker-compose logs -f

# Проверка статуса
docker-compose ps
```

#### Шаг 3: Проверка работоспособности

```bash
# Frontend доступен на http://localhost
# Backend API на http://localhost:3000
# PostgreSQL на localhost:5433
# Redis на localhost:6378

curl http://localhost:3000/api/health
```

#### Шаг 4: Управление контейнерами

```bash
# Остановить все сервисы
docker-compose stop

# Перезапустить сервисы
docker-compose restart

# Удалить контейнеры (но сохранить данные)
docker-compose down

# Удалить контейнеры и volumes (ОСТОРОЖНО: удалит данные БД!)
docker-compose down -v

# Пересборка образов
docker-compose build --no-cache

# Обновление и перезапуск
docker-compose up -d --build
```

### Деплой на VPS/Cloud с Docker

#### Шаг 1: Настройка VPS

```bash
# Подключение к серверу
ssh user@your-server-ip

# Установка Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# Установка Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Проверка установки
docker --version
docker-compose --version
```

#### Шаг 2: Клонирование проекта

```bash
# Создайте директорию для проекта
mkdir -p /opt/videomeet
cd /opt/videomeet

# Клонируйте репозиторий
git clone <your-repo-url> .

# Настройте .env
cp .env.example .env
nano .env
```

#### Шаг 3: Настройка Nginx (reverse proxy)

```bash
# Установка Nginx
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx -y

# Создание конфигурации
sudo nano /etc/nginx/sites-available/videomeet
```

Добавьте конфигурацию:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Socket.IO
    location /socket.io {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Активируйте конфигурацию:

```bash
sudo ln -s /etc/nginx/sites-available/videomeet /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Шаг 4: Настройка SSL с Let's Encrypt

```bash
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

#### Шаг 5: Запуск приложения

```bash
cd /opt/videomeet
docker-compose up -d
```

#### Шаг 6: Автозапуск при перезагрузке сервера

```bash
# Создайте systemd сервис
sudo nano /etc/systemd/system/videomeet.service
```

Содержимое файла:

```ini
[Unit]
Description=VideoMeet Application
Requires=docker.service
After=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/videomeet
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
```

Активируйте сервис:

```bash
sudo systemctl enable videomeet.service
sudo systemctl start videomeet.service
sudo systemctl status videomeet.service
```

---

## 🔐 Настройка переменных окружения

### Frontend (.env для Vercel)

```bash
# API Backend URL
VITE_API_URL=https://your-backend.onrender.com

# Socket.IO URL
VITE_SOCKET_URL=https://your-backend.onrender.com
```

### Backend (.env для Render)

```bash
# Node
NODE_ENV=production
PORT=3000

# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis
REDIS_HOST=your-redis-host.render.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password

# JWT
JWT_SECRET=your-super-secret-minimum-32-characters
JWT_EXPIRES_IN=7d

# CORS
CORS_ORIGIN=https://your-app.vercel.app

# Optional
ARGON2_MEMORY_COST=65536
ARGON2_TIME_COST=3
ARGON2_PARALLELISM=4
```

### Docker Compose (.env локально)

```bash
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=1234
POSTGRES_DB=videomeet
POSTGRES_PORT=5433

# Redis
REDIS_PASSWORD=redis123
REDIS_PORT=6378

# Backend
SERVER_PORT=3000
NODE_ENV=production
JWT_SECRET=local-dev-secret-key
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost

# Frontend
CLIENT_PORT=80
VITE_API_URL=http://localhost:3000
VITE_SOCKET_URL=http://localhost:3000

# Database URL
DATABASE_URL=postgresql://postgres:1234@localhost:5433/videomeet
```

---

## ✅ Проверка работоспособности

### После деплоя Frontend (Vercel)

1. **Откройте URL вашего приложения**: `https://your-app.vercel.app`
2. **Проверьте консоль браузера** на наличие ошибок
3. **Проверьте Network tab** - все ли ресурсы загружаются
4. **Попробуйте навигацию** по роутам

### После деплоя Backend (Render)

1. **Проверьте логи деплоя** в Render Dashboard
2. **Тестирование здоровья API**:
   ```bash
   curl https://your-backend.onrender.com/api/health
   ```
3. **Проверка Swagger документации**:
   ```
   https://your-backend.onrender.com/api-docs
   ```
4. **Тест WebSocket соединения** (через frontend)

### После Docker деплоя

```bash
# Проверка запущенных контейнеров
docker-compose ps

# Должны быть запущены:
# - videomeet-frontend
# - videomeet-backend
# - videomeet-postgres
# - videomeet-redis

# Проверка логов
docker-compose logs frontend
docker-compose logs backend
docker-compose logs postgres
docker-compose logs redis

# Проверка здоровья БД
docker-compose exec postgres pg_isready -U postgres

# Проверка Redis
docker-compose exec redis redis-cli ping
```

---

## 🐛 Решение проблем

### Frontend (Vercel)

#### Проблема: Build падает с ошибкой

**Решение**:
```bash
# Локально протестируйте сборку
cd client
npm install
npm run build

# Проверьте логи в Vercel Dashboard
# Убедитесь что Root Directory = "client"
```

#### Проблема: 404 на роутах SPA

**Решение**: Проверьте `vercel.json`:
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

#### Проблема: API запросы не работают (CORS)

**Решение**: Убедитесь что `CORS_ORIGIN` в backend включает ваш Vercel URL:
```bash
CORS_ORIGIN=https://your-app.vercel.app
```

### Backend (Render)

#### Проблема: Деплой падает на Prisma

**Решение**:
```bash
# Убедитесь что в Dockerfile есть:
RUN bun run prisma:generate

# И в startCommand:
bun run prisma:migrate:deploy && bun run start
```

#### Проблема: Не подключается к базе данных

**Решение**:
- Используйте **Internal Database URL**, а не External
- Формат: `postgresql://user:pass@dpg-xxx-a.frankfurt-postgres.render.com/dbname`
- Убедитесь что backend и БД в одном регионе

#### Проблема: WebSocket не работает

**Решение**:
- Убедитесь что используете `wss://` для production
- Проверьте CORS настройки
- В настройках Render убедитесь что HTTP/2 включен

### Docker

#### Проблема: Контейнер backend падает

**Решение**:
```bash
# Проверьте логи
docker-compose logs backend

# Проверьте подключение к БД
docker-compose exec backend bun run prisma db pull

# Перезапустите с rebuild
docker-compose up -d --build backend
```

#### Проблема: Нет подключения между контейнерами

**Решение**:
```bash
# Проверьте что все в одной сети
docker network ls
docker network inspect video-service_videomeet-network

# Проверьте DNS резолвинг
docker-compose exec backend ping postgres
docker-compose exec backend ping redis
```

#### Проблема: Volumes с данными БД не сохраняются

**Решение**:
```bash
# Проверьте volumes
docker volume ls

# Проверьте mapping в docker-compose.yml:
volumes:
  - postgres_data:/var/lib/postgresql/data
```

---

## 🔄 Обновление приложения

### Vercel (Frontend)

Автоматически деплоится при push в репозиторий:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```

### Render (Backend)

Также автоматический деплой:
```bash
git add .
git commit -m "Update backend"
git push origin main
```

### Docker (manual update)

```bash
# Получите последние изменения
git pull origin main

# Пересоберите и перезапустите
docker-compose up -d --build

# Накатите новые миграции если есть
docker-compose exec backend bun run prisma:migrate:deploy
```

---

## 📊 Мониторинг

### Vercel
- **Analytics**: Встроенные в dashboard
- **Logs**: Real-time в разделе Deployments

### Render
- **Metrics**: CPU, Memory, Response time
- **Logs**: Real-time streaming
- **Alerts**: Настройте email уведомления

### Docker
```bash
# Статистика ресурсов
docker stats

# Просмотр логов в реальном времени
docker-compose logs -f --tail=100

# Мониторинг с ctop (установите отдельно)
ctop
```

---

## 🔒 Безопасность

### Чеклист перед продакшеном

- [ ] Установлены сложные пароли для БД
- [ ] JWT_SECRET - случайная строка минимум 32 символа
- [ ] CORS правильно настроен (только нужные домены)
- [ ] HTTPS включен (Let's Encrypt/Cloudflare)
- [ ] Переменные окружения не в git
- [ ] Rate limiting настроен
- [ ] Helmet middleware включен
- [ ] Secrets в .env.production (не в коде)
- [ ] Database backups настроены (Render Auto Backup)
- [ ] Логирование ошибок настроено

---

## 📚 Дополнительные ресурсы

- [Vercel Documentation](https://vercel.com/docs)
- [Render Documentation](https://render.com/docs)
- [Docker Documentation](https://docs.docker.com/)
- [Prisma Deployment Guide](https://www.prisma.io/docs/guides/deployment)
- [Socket.IO Production](https://socket.io/docs/v4/using-multiple-nodes/)

---

## 🆘 Поддержка

Если возникли проблемы:
1. Проверьте секцию [Решение проблем](#решение-проблем)
2. Посмотрите логи сервисов
3. Проверьте переменные окружения
4. Создайте Issue в репозитории

---

**Удачного деплоя! 🚀**
