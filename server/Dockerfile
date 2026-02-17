# Используем Bun образ для быстрой сборки и выполнения
FROM oven/bun:1 AS base

WORKDIR /app

# Устанавливаем production зависимости
FROM base AS install-prod
RUN mkdir -p /temp/prod
COPY package.json /temp/prod/
COPY prisma /temp/prod/prisma
COPY prisma.config.ts /temp/prod/
WORKDIR /temp/prod
RUN bun install --frozen-lockfile --production

# Устанавливаем ВСЕ зависимости (включая dev) для сборки
FROM base AS install-dev
RUN mkdir -p /temp/dev
COPY package.json /temp/dev/
COPY prisma /temp/dev/prisma
COPY prisma.config.ts /temp/dev/
WORKDIR /temp/dev
RUN bun install --frozen-lockfile

# Этап сборки с dev зависимостями
FROM base AS prerelease
COPY --from=install-dev /temp/dev/node_modules node_modules
COPY . .

# Генерируем Prisma Client
RUN bun run prisma:generate

# Собираем TypeScript
RUN bun run build
# Production образ с минимальными зависимостями
FROM base AS release
COPY --from=install-prod /temp/prod/node_modules node_modules
COPY --from=prerelease /app/dist ./dist
COPY --from=prerelease /app/prisma ./prisma
COPY --from=prerelease /app/src/generated ./dist/generated
COPY --from=prerelease /app/scripts ./scripts
COPY package.json .

# Устанавливаем пользователя для безопасности
USER bun

# Открываем порт приложения
EXPOSE 3000

# Запускаем миграции и приложение
ENTRYPOINT ["bun", "run", "start:prod"]
