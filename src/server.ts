import { createServer } from 'http';
import express from 'express';
import Busboy from 'busboy';
import morgan from 'morgan';
import cors from 'cors';

import { v1 } from 'uuid';
import { Meta } from './models/meta';
import { FileStore } from './file-store';
import { join } from 'path';
import { tmpdir } from 'os';

/**
 * Express only provides *some* help when behind a proxy...
 * This is a kludge to figure out the port
 * @param req
 * @param listeningPort
 */
function determinePort(req: express.Request, listeningPort: Number | String) {
  let localPort = req.get('x-forwarded-port');
  if (Array.isArray(localPort)) {
    localPort = localPort[0];
  }
  if (!localPort) {
    // use listener port, even though that might be wrong
    localPort = listeningPort && listeningPort.toString();
  }
  if (localPort && !['80', '443'].includes(localPort)) {
    return ':' + localPort;
  }
  return '';
}

/**
 * Fake middleware to require authorization header with any value
 *
 * @param req
 * @param res
 * @param next
 */
function fakeAuth(req: express.Request, res: express.Response, next) {
  if (!req.headers.authorization) {
    return res.status(403).json('denied');
  }
  return next();
}

/**
 *
 * @param port
 * @param endpoint path to listen on default is content. Must not begin with /
 */
async function run() {
  const port = process.env.CM_PORT || 8888;
  const endpoint = process.env.CM_ENDPOINT || 'movia/content';
  const dataPath = process.env.CM_DATAPATH || join(tmpdir(), 'tiny-cm');
  const ns = process.env.CM_NAMESPACE || 'http://fiorellonj/com/tiny-cm';

  // Create the file store.
  const store = await new FileStore(dataPath).init();

  // Setup logging and enable proxy handling
  const app = express();
  app.set('trust proxy', 'loopback, linklocal, uniquelocal');
  app.use(morgan('dev'));
  app.use(cors());

  // GET /movia/content/:entityId
  // Should return the content (file) for the matching entity.
  // Content-Type should be set to original mimeType captured on upload.
  //    or at any rate a valid content type
  // Content-Length should be set to file length.
  // If entityId is not in the store, (in this case the index) return 404.
  // For other errors (like i/o failures) leave as 500's
  app.get(
    `/${endpoint}/:entityId`,
    async (req: express.Request, res: express.Response) => {
      const meta: Meta = await store.find(req.params.entityId);
      if (!meta) {
        return res.sendStatus(404);
      }
      // set correct mime type and return the file
      res.setHeader('Content-Type', meta.mimeType);
      res.setHeader('x-original-filename', meta.fileName);
      res.sendFile(meta.contentPath, { maxAge: '365 days', immutable: true });
    }
  );

  // POST /movia/content
  // Body is assumed to be multipart/form-data and contain exactly 1 file
  // Should store content of the file.
  // Should store basic metadata like mimeType and fileName
  // Should create new entity in EMS on every post.
  // Should associate file and metadata with entityId.
  // Returns JSON with entity and link.
  //
  // Should return 400 for posts without a file.
  // Should return 201 for single file.
  // Should return 200 for multiple files.
  app.post(
    `/${endpoint}`,
    fakeAuth,
    (req: express.Request, res: express.Response) => {
      const localPort = determinePort(req, port);
      const root = `${req.protocol}://${req.hostname}${localPort}/${endpoint}`;
      const promises: Promise<Meta>[] = [];

      const busboy = new Busboy({ headers: req.headers });
      // When file header is encountered...
      busboy.on('file', async (fieldName, file, fileName, encoding, mimeType) =>
        // Save file directly to store.
        promises.push(
          store.create(file, fileName, encoding, mimeType, `${ns}/${v1()}`)
        )
      );

      // When all the file(s) has been read, create the entities
      busboy.on('finish', async () => {
        const uploads = (await Promise.all(promises)).map((meta) => ({
          // Link is used by froalaEditor
          link: `${root}/${encodeURIComponent(meta.entityId)}`,
          entity: {
            id: meta.entityId,
            type: [`${ns}#Content`],
            label: meta.fileName,
          },
        }));

        if (uploads.length === 0) {
          return res.status(400).json('No files were uploaded');
        }
        if (uploads.length === 1) {
          res.setHeader('Location', uploads[0].link);
          return res.status(201).json(uploads[0]);
        }
        return res.status(200).json(uploads);
      });

      // pipe the response into the handler
      return req.pipe(busboy);
    }
  );

  //
  // DELETE /movia/content/:entityId
  // Deletes image from the CM system.
  // Should return 204 on success.
  //
  app.delete(`/${endpoint}/:entityId`, fakeAuth, async (req, res) => {
    const meta = await store.find(req.params.entityId);
    if (meta) {
      // Wait for store delete to continue...
      await store.delete(meta.entityId);
    }
    res.sendStatus(204);
  });

  // Anything else on this endpoint is 404
  app.use((req, res, next) => res.sendStatus(404));

  app.use((err, req, res, next) => {
    console.error(err.stack);
    res.sendStatus(500);
  });

  // Start the server
  const server = createServer(app);
  server.on('error', (e: any) => {
    console.error(`Server Error: ${e.code}: ${e.message}`);
    server.close();
  });
  server.on('close', () => {
    this.store.close();
  });
  server.listen(port, () => {
    console.log(`Server Listening on http://0.0.0.0:${port}/${endpoint}/`);
  });
}

// Run
run();
