# Используем официальный образ Node.js
FROM node:24-alpine

# Устанавливаем рабочую директорию
WORKDIR /app
ENV NODE_ENV=production HOST=0.0.0.0

# Копируем package.json и package-lock.json
COPY package*.json ./

# Устанавливаем зависимости
RUN npm ci --omit=dev

# Копируем остальной код
COPY . .
RUN chown -R node:node /app
USER node

# Собираем приложение (если необходимо, например, с TypeScript)
# RUN npm run build


# Указываем порт, на котором будет работать приложение
EXPOSE 3000

# Запускаем приложение
CMD ["npm", "start"]
