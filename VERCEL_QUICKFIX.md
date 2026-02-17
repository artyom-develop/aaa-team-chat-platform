# Быстрая инструкция по исправлению ошибки Vercel

## 🚨 Текущая ошибка
`Environment Variable "VITE_API_URL" references Secret "vite_api_url", which does not exist.`

## ✅ Быстрое решение (2 минуты)

### Шаг 1: Удалите неправильные переменные на Vercel

1. Откройте: https://vercel.com/dashboard → ваш проект
2. **Settings** → **Environment Variables**
3. **Удалите все переменные** `VITE_API_URL` и `VITE_SOCKET_URL`

### Шаг 2: Добавьте правильные переменные

Нажмите **Add New** для каждой переменной:

**Переменная 1:**
```
Key: VITE_API_URL
Value: https://video-meet-for-aaateam.onrender.com/api
Environments: ✅ Production ✅ Preview ✅ Development
```

**Переменная 2:**
```
Key: VITE_SOCKET_URL
Value: https://video-meet-for-aaateam.onrender.com
Environments: ✅ Production ✅ Preview ✅ Development
```

### Шаг 3: Переделайте деплой

1. **Deployments** → последний деплой → **⋮** → **Redeploy**
2. ❗ **Важно**: Снимите галочку **Use existing Build Cache**
3. Нажмите **Redeploy**

## 🎯 Готово!

Через 1-2 минуты ваше приложение будет работать с бэкендом на Render.

## 📝 Настройка CORS на бэкенде (Render)

Не забудьте на Render добавить переменную окружения:

1. Откройте: https://dashboard.render.com → ваш backend сервис
2. **Environment** → **Add Environment Variable**
3. Добавьте:
```
Key: CORS_ORIGIN
Value: https://ваш-домен.vercel.app
```
(замените на реальный URL вашего Vercel приложения)

4. Нажмите **Save Changes** → сервис автоматически перезапустится

---

Подробная документация: [VERCEL_ENV_SETUP.md](./VERCEL_ENV_SETUP.md)
