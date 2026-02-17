# Используем Bun образ для быстрой сборки и выполнения
FROM oven/bun:1 AS base

WORKDIR /app

# Устанавливаем зависимости только для продакшена
FROM base AS install
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
WORKDIR /temp/prod
RUN bun install --frozen-lockfile --production

# Копируем зависимости и исходный код
FROM base AS prerelease
COPY --from=install /temp/prod/node_modules node_modules
COPY . .

# Генерируем Prisma Client
RUN bun run prisma:generate

# Собираем TypeScript
RUN bun run build

# Production образ
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /app/dist ./dist
COPY --from=prerelease /app/prisma ./prisma
COPY --from=prerelease /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=prerelease /app/node_modules/@prisma ./node_modules/@prisma
COPY package.json .

# Устанавливаем пользователя для безопасности
USER bun

# Открываем порт приложения
EXPOSE 3000

# Запускаем приложение
ENTRYPOINT ["bun", "run", "start"]
