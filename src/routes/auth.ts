import { Router } from 'express';
import { v1 } from 'uuid';

/**
 *
 */
function authEndpoint(): Router {
  const router = Router();

  router.post('/realms/:realm/protocol/openid-connect/token', (req, res) => {
    res.status(200).json({
      token_type: 'bearer',
      access_token: `${v1()}-${req.params.realm}`
    });
  });

  return router;
}

export default authEndpoint;
