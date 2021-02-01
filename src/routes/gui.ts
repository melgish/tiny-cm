import express from 'express';
import config from '../config';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
import { logger } from '../logger';

/**
 * Returns GUI endpoint only if it was found
 */
function guiEndpoint(): express.Router {
  if (!config.ngApplication) {
    return null;
  }
  const path = resolve(config.ngApplication);
  if (!path) {
    return null;
  }

  if (!existsSync(path)) {
    logger.debug(`Not serving ${path}. Not found`);
    return null;
  }
  logger.debug(`Serve ${path}.`);
  const index = join(path, 'index.html');
  if (!existsSync(index)) {
    logger.debug(`Not serving ${path}. No index.html`);
    return null;
  }

  const router = express.Router();
  router.use(express.static(path, { index }));
  router.get('*', (req, res, next) => {
    if (req.headers.accept.match(/html/)) {
      return res.sendFile(index);
    }
    next();
  });

  return router;
}

export default guiEndpoint;
