# Заметки по деплою на Render

## Важные изменения для продакшена

### 1. Redis без авторизации

**Проблема:** Бесплатный план Redis на Render не поддерживает пароли.

**Решение:** 
- В `render.yaml` закомментирован `REDIS_PASSWORD`
- В `src/config/redis.config.ts` пароль теперь опциональный
- Если переменная `REDIS_PASSWORD` не задана, клиент подключается без авторизации

### 2. Логирование в файлы отключено

**Проблема:** В Docker контейнере процесс не имеет прав создавать папки.

**Решение:**
- В `src/utils/logger.ts` файловые транспорты Winston активны только в `development`
- В `production` логи пишутся только в консоль
- Render автоматически собирает логи из stdout/stderr

### 3. Миграции базы данных

**Проблема:** `prisma migrate deploy` требует `datasource.url` в schema, что не поддерживается в Prisma 7.

**Решение:**
- Создан кастомный скрипт миграций: `scripts/migrate.mjs`
- Применяет SQL миграции напрямую через `pg`
- Отслеживает примененные миграции в таблице `_prisma_migrations`
- В `render.yaml` используется: `node scripts/migrate.mjs && bun run start`

### 4. Переменные окружения на Render

Необходимо установить следующие переменные:

#### Обязательные:
- `NODE_ENV=production`
- `PORT=3000`
- `DATABASE_URL` - автоматически от PostgreSQL сервиса
- `REDIS_HOST` - автоматически от Redis сервиса
- `REDIS_PORT` - автоматически от Redis сервиса
- `JWT_SECRET` - сгенерировать автоматически
- `CORS_ORIGIN` - URL вашего фронтенда на Vercel

#### Опциональные:
- `REDIS_PASSWORD` - только если используете платный план Redis с паролем
- `JWT_EXPIRES_IN` - по умолчанию 7d
- `TURN_URL`, `TURN_USERNAME`, `TURN_CREDENTIAL` - если используете TURN сервер

## Checklist перед деплоем

- [ ] Убедитесь, что все файлы закоммичены в Git
- [ ] Проверьте, что `CORS_ORIGIN` в `render.yaml` указывает на ваш фронтенд
- [ ] Создайте PostgreSQL базу данных на Render
- [ ] Создайте Redis сервис на Render
- [ ] Создайте Web Service и укажите GitHub репозиторий
- [ ] Дождитесь успешного деплоя
- [ ] Проверьте логи на наличие ошибок
- [ ] Обновите URL бэкенда в настройках фронтенда на Vercel

## Мониторинг

После деплоя проверьте:
1. **Логи билда** - должны пройти без ошибок
2. **Логи запуска** - проверьте сообщение "Server is ready to accept connections"
3. **Консоль Redis** - проверьте подключение без ошибок
4. **База данных** - убедитесь, что таблицы созданы
5. **Health check** - попробуйте открыть `https://your-app.onrender.com/api/auth/test`

## Полезные команды

### Просмотр логов на Render
Логи доступны в Dashboard → Your Service → Logs

### Перезапуск сервиса
Dashboard → Your Service → Manual Deploy → Clear build cache & deploy

### Проверка переменных окружения
Dashboard → Your Service → Environment → Environment Variables

## Типичные ошибки

### "EACCES: permission denied, mkdir 'logs'"
✅ Решено: логирование в файлы отключено в production

### "Redis connection failed: NOAUTH Authentication required"
✅ Решено: пароль теперь опциональный

### "The table public.users does not exist"
✅ Решено: используется кастомный скрипт миграций

### "Cannot find module '../generated/prisma/index.js'"
✅ Решено: в Dockerfile правильно копируется `dist/generated`

## Дополнительная информация

- [Render Documentation](https://render.com/docs)
- [Render Redis](https://render.com/docs/redis)
- [Render PostgreSQL](https://render.com/docs/databases)
