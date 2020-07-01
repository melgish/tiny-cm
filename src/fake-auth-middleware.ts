import express from 'express';

/**
 * Completely fake authorization middleware.
 * Just looks for any authorization header.
 *
 * @param req
 * @param res
 * @param next
 */
export function fakeAuthMiddleware(
  req: express.Request,
  res: express.Response,
  next
) {
  if (!req.headers.authorization) {
    return res.status(403).json('denied');
  }
  return next();
}

export default fakeAuthMiddleware;
