import { Request, Response, NextFunction } from 'express';

/**
 * Completely fake authorization middleware.
 * Just looks for any authorization header.
 *
 * @param req Request middleware parameter
 * @param res Response parameter
 * @param next Continuation
 */
export function fakeAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (req.headers.authorization) {
    return next();
  }
  res.status(403).json('denied');
}

export default fakeAuthMiddleware;
