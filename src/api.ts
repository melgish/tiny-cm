import { Router } from 'express';
import { v1 } from 'uuid';
import busboy from 'busboy';

import { Meta } from './meta';
import { FileStore } from './file-store';
import { resolve } from 'path';

/**
 * API to access content store
 *
 * @param store Content store.
 */
export const api = (store: FileStore): Router => {
  const route = Router();

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
  route.post(`/`, async (req, res) => {
    const promises: Promise<Meta>[] = [];
    try {
      const bb = busboy({ headers: req.headers });

      // When file header is encountered...
      bb.on('file', async (fieldName, file, info) => {
        const { filename, encoding, mimeType } = info;
        // Save the file directly to store.
        promises.push(
          store.create(file, filename, encoding, mimeType, `uuid:${v1()}`),
        );
      });

      // When all the file(s) has been read, create the entities
      bb.on('finish', async () => {
        // Wait for all the promises to be resolved.
        const results = await Promise.all(promises);
        const uploads = results.map((meta) => ({
          url: `${req.baseUrl}/${meta.entityId}`,
          ...meta,
          // Don't send content path to client.
          contentPath: undefined,
        }));

        // link: `/content/${encodeURIComponent(meta.entityId)}`,
        // entity: {
        //   id: meta.entityId,
        //   type: [`http://example.com/fake/namespace#Content`],
        //   label: meta.fileName,
        // },

        if (uploads.length === 0) {
          return res.status(400).json({
            statusCode: 400,
            message: 'Bad Request: No files were uploaded',
          });
        }

        return res.status(200).json({
          statusCode: 200,
          items: uploads,
        });
      });

      // Pipe the response into the handler
      return req.pipe(bb);
    } catch (err) {
      return res.status(400).json({
        statusCode: 400,
        message: `Bad Request: ${err.message}`,
      });
    }
  });

  /**
   * Return a list of what's in the store.
   */
  route.get('/', async (req, res) => {
    res.status(200).json(
      store.list().map((meta) => ({
        url: `${req.baseUrl}/${meta.entityId}`,
        ...meta,
      })),
    );
  });
  // GET //content/:entityId
  // Should return the content (file) for the matching entity.
  // Content-Type should be set to original mimeType captured on upload.
  //    or at any rate a valid content type
  // Content-Length should be set to file length.
  // If entityId is not in the store, (in this case the index) return 404.
  // For other errors (like i/o failures) leave as 500's
  route.get(`/:entityId`, async (req, res, next) => {
    const meta: Meta = await store.find(req.params.entityId);
    if (!meta) {
      return next();
    }
    // set correct mime type and return the file
    res.setHeader('Content-Type', meta.mimeType);
    res.setHeader('x-original-filename', meta.fileName);
    const fullPath = resolve(meta.contentPath);
    res.sendFile(fullPath, { maxAge: '365 days', immutable: true });
  });

  //
  // DELETE /content/:entityId
  // Deletes image from the CM system.
  // Should return 204 on success.
  //
  route.delete(`/:entityId`, async (req, res) => {
    const meta = await store.find(req.params.entityId);
    if (meta) {
      // Wait for store delete to continue...
      await store.delete(meta.entityId);
    }
    res.sendStatus(204);
  });

  // Anything else on this endpoint is 404
  route.use((req, res): void => {
    res.status(404).json({
      statusCode: 404,
      message: 'Not Found',
    });
  });

  // 4 parameters required for express error handler.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  route.use((err, req, res, next) => {
    res.status(400).json({
      statusCode: 400,
      message: 'Bad Request',
    });
  });

  return route;
};
