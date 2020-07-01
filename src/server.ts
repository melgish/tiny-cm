import { createServer } from 'http';
import express from 'express';
import morgan from 'morgan';
import { FileStore } from './file-store';
import config from './config';

import guiEndpoint from './routes/gui';
import contentEndpoint from './routes/content';
import authEndpoint from './routes/auth';

/**
 *
 * @param port
 * @param endpoint path to listen on default is content. Must not begin with /
 */
async function run() {
  // Setup logging and enable proxy handling
  const app = express();
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(morgan('dev'));

  // attach the content endpoint
  // Create the file store on the supplied dataPath.
  const store = await new FileStore(config.dataPath).init();
  app.use(`/${config.endpoint}`, contentEndpoint(store));

  // if public folder exists, serve that as an angular application
  const gui = guiEndpoint();
  if (gui) {
    app.use('/', gui);
  }

  app.use('/auth', authEndpoint());

  app.use((req, res, next) => res.sendStatus(404));

  // Start the server
  const server = createServer(app);
  server.on('error', (e: any) => {
    console.error(`Server Error: ${e.code}: ${e.message}`);
    server.close();
  });
  server.on('close', () => store.close());

  server.listen(config.port, () => {
    console.log(
      `Server Listening on http://0.0.0.0:${config.port}/${config.endpoint}/`
    );
  });
}

// Run
run();
