import { expect } from 'chai';
import { spy } from 'sinon';
import { logger, loggerMiddleware, write } from './logger';

describe('logger', () => {
  it('logger should exist', () => {
    // Verify that logger was created with methods used in code
    expect(logger).to.exist;
    expect(loggerMiddleware).to.exist;
    expect(write).to.exist;
  });

  describe('write', () => {
    it('should log messages using logger.', () => {
      const log = spy(logger, 'info');
      try {
        write('message');
        expect(log.called).to.be.true;
      } finally {
        log.restore();
      }
    });
  });
});
