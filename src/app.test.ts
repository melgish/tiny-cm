import { describe, expect, it, vi } from 'vitest';
import { app, server, start, stop, store } from './app';

vi.mock('./file-store');
vi.mock('node:http', () => ({
  createServer: () => ({
    close: vi.fn().mockImplementation(fn => fn()),
    listen: vi.fn().mockImplementation((p, fn) => fn())
  }),
}));

describe('app', () => {
  it('should exist', () => {
    expect(app).toBeTruthy();
  });

  describe('shutdown', () => {
    it('should close the server', async () => {
      await stop();

      expect(server.close).toBeCalled();
    });
  });

  describe('start', () => {
    it('should start the listener', async () => {
      await start();

      expect(store.init).toBeCalled();
      expect(server.listen).toBeCalled();
    });
  });
});
