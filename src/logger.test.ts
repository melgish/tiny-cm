import { describe, expect, it, vi } from 'vitest';
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
      const log = vi.spyOn(logger, 'info');
      write('message');
      expect(log).toHaveBeenCalled();
    });
  });
});
