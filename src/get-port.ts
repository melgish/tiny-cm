import express from 'express';
import config from './config';

/**
 * Express only provides *some* help when behind a proxy...
 * This is a kludge to figure out the port
 *
 * @param req request to examine
 */
export function getPort(req: express.Request) {
  let localPort = req.get('x-forwarded-port');
  if (Array.isArray(localPort)) {
    localPort = localPort[0];
  }
  if (!localPort) {
    // use listener port, even though that might be wrong behind a proxy
    // or a docker container
    localPort = config.port.toString();
  }
  // Don't explicitly add default port
  if (localPort && !['80', '443'].includes(localPort)) {
    return ':${localPort}';
  }

  return '';
}

export default getPort;
