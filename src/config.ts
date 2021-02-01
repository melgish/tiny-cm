import { env } from 'process';
import { join, resolve } from 'path';
import { tmpdir } from 'os';

/**
 * Configuration from environment
 */
class Config {
  /**
   * Port number
   */
  readonly port: number = Number(env.CM_PORT) || 8888;
  /**
   * Endpoint
   */
  readonly endpoint: string = env.CM_ENDPOINT || 'movia/content';
  /**
   * Data path
   */
  readonly dataPath: string = env.CM_DATAPATH || join(tmpdir(), 'tiny-cm');
  /**
   * Entity namespace
   */
  readonly namespace: string =
    env.CM_NAMESPACE || 'http://fiorellonj.com/tiny-cm';
  /**
   * Path to angular application to serve along side api
   */
  readonly ngApplication: string = env.NG_APP ? resolve(env.NG_APP) : '';
}

export default new Config();
