import { createLogger, transports, format } from 'winston';
import morgan from 'morgan';

/**
 * Logger to add timestamp to console.
 */
export const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
    format.printf((info) => `${info.timestamp} ${info.level} ${info.message}`),
  ),
  transports: [new transports.Console()],
});

/**
 * Forwards Morgan messages to logger.
 *
 * @param message Message to write
 */
export const write = (message: string): void => {
  logger.info(message.substring(0, message.lastIndexOf('\n')));
};

/**
 * Morgan middleware for logging requests
 */
export const loggerMiddleware = morgan('tiny', { stream: { write } });
