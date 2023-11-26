import { createServer } from 'node:http';
import compression from 'compression';
import cors from 'cors';
import express from 'express';
import { rateLimit } from 'express-rate-limit';

import { FileStore } from './file-store';
import { api } from './api';
import { logger, loggerMiddleware } from './logger';

//  Allow environment to change default behaviors
const port = Number(process.env.HTTP_PORT || 3000);
const dataRoot = process.env.DATA_ROOT || '/app/data';
const saveSeconds = Number(process.env.SAVE_SECONDS || 60);
const maxRequests = Number(process.env.MAX_REQUESTS_PER_MINUTE || 60);

export const store = new FileStore(dataRoot);

// Configure Express
export const app = express();
// Setup logging and enable proxy handling
app.use(rateLimit({ windowMs: 1000 * 60, max: maxRequests }));
app.use(loggerMiddleware);
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.use(cors());
app.use(compression());
app.options('*', cors());
app.use('/content', api(store));

export const server = createServer(app);
export const stop = async (): Promise<void> => {
  logger.info('Beginning shutdown.');
  server.close(async (): Promise<void> => {
    // Close the file store.
    await store.flush();
    logger.info('Shutdown complete.');
  });
};

export async function start(): Promise<void> {
  // Wait for File store to initialize.
  await store.init(saveSeconds);

  // Listen for terminal events to trigger shutdown.
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  // Start the HTTP server.
  server.listen(port, () => {
    logger.info(`Listening on port ${port}`);
  });
}

// Only start when launched directly
/* istanbul ignore if */
if (require.main === module) {
  start();
}
