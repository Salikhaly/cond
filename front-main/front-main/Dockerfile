# Этап сборки
FROM node:24-alpine as build

# Устанавливаем рабочую директорию
WORKDIR /app
ENV API_URL_DEV=/api LOCAL_DEMO=false

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci

# Копируем остальной код и собираем приложение
COPY . .
RUN npm run build

# Этап сервера для обслуживания статических файлов
FROM nginx:stable-alpine

# Копируем собранные файлы в директорию Nginx
COPY --from=build /app/build /usr/share/nginx/html

# Копируем собственную конфигурацию Nginx (опционально)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Указываем порт
EXPOSE 80

# Запускаем Nginx
CMD ["nginx", "-g", "daemon off;"]
