# Настройка переменных окружения на Vercel

## Проблема

Ошибка: `Environment Variable "VITE_API_URL" references Secret "vite_api_url", which does not exist.`

## Решение

### Способ 1: Через Vercel Dashboard (Рекомендуется)

1. Откройте ваш проект на Vercel: https://vercel.com/dashboard
2. Перейдите в **Settings** → **Environment Variables**
3. Удалите все существующие переменные `VITE_API_URL` и `VITE_SOCKET_URL` (если они есть)
4. Добавьте новые переменные:

#### VITE_API_URL
- **Key**: `VITE_API_URL`
- **Value**: `https://video-meet-for-aaateam.onrender.com/api`
- **Environment**: Production, Preview, Development (выберите все)

#### VITE_SOCKET_URL
- **Key**: `VITE_SOCKET_URL`
- **Value**: `https://video-meet-for-aaateam.onrender.com`
- **Environment**: Production, Preview, Development (выберите все)

5. Нажмите **Save**
6. **Переделайте деплой** (Redeploy):
   - Перейдите в **Deployments**
   - Найдите последний деплой
   - Нажмите три точки (⋮) → **Redeploy**
   - Выберите **Use existing Build Cache: No** (чтобы пересобрать с новыми переменными)

### Способ 2: Через vercel.json (Альтернатива)

Переменные уже добавлены в `vercel.json`. Просто сделайте:

```bash
git add client/vercel.json
git commit -m "Update Vercel environment variables"
git push
```

Vercel автоматически задеплоит с новой конфигурацией.

### Способ 3: Через Vercel CLI

Если используете Vercel CLI:

```bash
cd client

# Установите переменные окружения
vercel env add VITE_API_URL production
# Введите: https://video-meet-for-aaateam.onrender.com/api

vercel env add VITE_SOCKET_URL production
# Введите: https://video-meet-for-aaateam.onrender.com

# Переделайте деплой
vercel --prod
```

## Проверка

После деплоя проверьте:

1. Откройте ваше приложение на Vercel
2. Откройте Developer Tools (F12) → Console
3. Убедитесь, что нет ошибок CORS
4. Попробуйте залогиниться или зарегистрироваться
5. Проверьте во вкладке Network, что запросы идут на `https://video-meet-for-aaateam.onrender.com/api`

## Важные замечания

### ⚠️ Не используйте Secrets для переменных Vite

Vite переменные (`VITE_*`) должны быть **публичными Environment Variables**, а не Secrets, потому что:
- Они встраиваются в код при сборке
- Они видны в браузере
- Secrets предназначены для чувствительных данных на сервере

### ✅ Правильная конфигурация

```
Environment Variables (не Secrets):
  VITE_API_URL = https://video-meet-for-aaateam.onrender.com/api
  VITE_SOCKET_URL = https://video-meet-for-aaateam.onrender.com
```

### ❌ Неправильная конфигурация

```
Secrets:
  vite_api_url = https://...
  
Environment Variables:
  VITE_API_URL = @vite_api_url  ← Так делать НЕЛЬЗЯ для Vite переменных
```

## Обновление URL бэкенда

Если URL вашего бэкенда изменится:

1. Обновите переменные на Vercel (способ 1)
2. Или обновите `vercel.json` и сделайте commit+push
3. Переделайте деплой

## Настройка CORS на бэкенде

Убедитесь, что на бэкенде (Render) установлена переменная окружения:

```
CORS_ORIGIN=https://your-frontend-app.vercel.app
```

Замените `your-frontend-app.vercel.app` на реальный URL вашего фронтенда на Vercel.

## Полезные ссылки

- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
- [Vite Environment Variables](https://vitejs.dev/guide/env-and-mode.html)
- [Vercel CLI](https://vercel.com/docs/cli)
