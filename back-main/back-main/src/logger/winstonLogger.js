const { createLogger, format, transports } = require('winston');
const { combine, timestamp, label, printf, colorize } = format;
require('colors');

// Определение формата логов
const logFormat = printf(({ level, message, label, timestamp }) => {
    return `${timestamp} [${label}] ${level}: ${message}`;
});

const logger = createLogger({
    format: combine(
        label({ label: 'my-app' }), // Метка для логов
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }), // Форматирование временной метки
        colorize(), // Добавление цвета для уровней логов
        logFormat // Применение пользовательского формата
    ),
    transports: [
        new transports.Console(), // Логирование в консоль
        ...(process.env.VERCEL ? [] : [new transports.File({ filename: 'app.log', format: combine(
            label({ label: 'my-app' }),
            timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
            logFormat // Применение пользовательского формата без цветов для файла
        )})])
    ]
});

module.exports = logger;
