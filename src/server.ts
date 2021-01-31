import { createServer } from 'http';
import express from 'express';
import { FileStore } from './file-store';
import config from './config';

import contentEndpoint from './routes/content';
import authEndpoint from './routes/auth';
import { logger, loggerMiddleware } from './logger';
import cors from 'cors';
import compression from 'compression';

const store = new FileStore(config.dataPath);

// Configure Express
const app = express();
// Setup logging and enable proxy handling
app.use(loggerMiddleware);
app.set('trust proxy', 'loopback, linklocal, uniquelocal');
app.use(cors());
app.use(compression());
app.options('*', cors());
app.use(`/${config.endpoint}`, contentEndpoint(store));
// Include fake authentication endpoint
app.use('/auth', authEndpoint());


export const server = createServer(app);
export const stop = async (): Promise<void> => {
  logger.info('Beginning shutdown.');
  server.close(
    async (): Promise<void> => {
      // Close the file store.
      await store.close();
      logger.info('Shutdown complete.');
    }
  );
};

export async function start(): Promise<void> {
  // Wait for File store to initialize.
  await store.init();

  // Listen for terminal events to trigger shutdown.
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);

  // Start the HTTP server.
  server.listen(config.port, () => {
    logger.info(`Listening on port ${config.port}`);
  });
}

// Only start when launched directly
/* istanbul ignore if */
if (require.main === module) {
  start();
}
