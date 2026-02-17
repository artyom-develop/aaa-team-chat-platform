# Двухэтапная сборка для оптимизации размера образа
# Этап 1: Сборка приложения
FROM node:20-alpine AS builder

WORKDIR /app

# Объявляем build arguments для переменных окружения Vite
ARG VITE_API_URL
ARG VITE_SOCKET_URL

# Устанавливаем переменные окружения для процесса сборки
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_SOCKET_URL=${VITE_SOCKET_URL}

# Копируем package.json и устанавливаем зависимости
COPY package.json ./
RUN npm install --legacy-peer-deps

# Копируем исходный код и собираем приложение
COPY . .
RUN npm run build

# Этап 2: Production образ с Nginx
FROM nginx:alpine

# Удаляем стандартную конфигурацию nginx
RUN rm -rf /usr/share/nginx/html/*

# Копируем собранное приложение из builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Копируем кастомную конфигурацию nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Открываем порт 80
EXPOSE 80

# Запускаем nginx
CMD ["nginx", "-g", "daemon off;"]
