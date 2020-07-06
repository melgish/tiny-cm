import express from 'express';
import { v1 } from 'uuid';
import Busboy from 'busboy';

import { Meta } from '../models/meta';
import { FileStore } from '../file-store';
import getPort from '../get-port';
import fakeAuthMiddleware from '../fake-auth-middleware';
import config from '../config';

/**
 * API to access content store
 *
 * @param store store to include
 */
function contentEndpoint(store: FileStore) {
  const router = express.Router();

  // GET /movia/content/:entityId
  // Should return the content (file) for the matching entity.
  // Content-Type should be set to original mimeType captured on upload.
  //    or at any rate a valid content type
  // Content-Length should be set to file length.
  // If entityId is not in the store, (in this case the index) return 404.
  // For other errors (like i/o failures) leave as 500's
  router.get(`/:entityId`, async (req, res) => {
    const meta: Meta = await store.find(req.params.entityId);
    if (!meta) {
      return res.sendStatus(404);
    }
    // set correct mime type and return the file
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('x-original-filename', meta.fileName);
    res.sendFile(meta.contentPath, { maxAge: '365 days', immutable: true });
  });

  /**
   * Return a list of what's in the store.
   */
  router.get('', async (req, res) => {
    res.status(200).json(store.list().map(meta => ({
      url: `${config.endpoint}/${encodeURIComponent(meta.entityId)}`,
      ...meta,
    })));
  });

  // POST /content
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
  router.post(`/`, fakeAuthMiddleware, async (req, res) => {
    const localPort = getPort(req);
    const root = `${req.protocol}://${req.hostname}${localPort}/${config.endpoint}`;
    const promises: Promise<Meta>[] = [];

    const busboy = new Busboy({ headers: req.headers });
    // When file header is encountered...
    busboy.on('file', async (fieldName, file, fileName, encoding, mimeType) =>
      // Save file directly to store.
      promises.push(
        store.create(
          file,
          fileName,
          encoding,
          mimeType,
          `${config.namespace}/${v1()}`
        )
      )
    );

    // When all the file(s) has been read, create the entities
    busboy.on('finish', async () => {
      const uploads = (await Promise.all(promises)).map((meta) => ({
        // Link is used by froalaEditor
        link: `${root}/${encodeURIComponent(meta.entityId)}`,
        entity: {
          id: meta.entityId,
          type: [`${config.namespace}#Content`],
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
  });

  //
  // DELETE /content/:entityId
  // Deletes image from the CM system.
  // Should return 204 on success.
  //
  router.delete(`/:entityId`, fakeAuthMiddleware, async (req, res) => {
    const meta = await store.find(req.params.entityId);
    if (meta) {
      // Wait for store delete to continue...
      await store.delete(meta.entityId);
    }
    res.sendStatus(204);
  });

  // Anything else on this endpoint is 404
  router.use((req, res, next) => res.status(404).json('Not Found'));

  // Anything after that is an error
  router.use((err, req, res, next) => {
    console.error(err.stack);
    res.sendStatus(500);
  });

  return router;
}

/**
 * Export
 */
export default contentEndpoint;
