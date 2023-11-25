import { expect } from 'chai';
import { fake, replace, SinonSpy, stub } from 'sinon';
import { app, server, start, stop, store } from './app';

describe('app', () => {
  it('should exist', () => {
    expect(app).to.exist;
  });

  describe('shutdown', () => {
    it('should close the server', async () => {
      // Execute the callback as well.
      const faked = fake((fn) => fn());
      replace(server, 'close', faked);

      await stop();

      expect(faked.called).to.be.true;
    });
  });

  describe('start', () => {
    it('should start the listener', async () => {
      replace(
        server,
        'listen',
        fake((port, fn) => fn()),
      );
      stub(store, 'init').resolves();

      await start();

      expect((store.init as SinonSpy).called).to.be.true;
      expect((server.listen as SinonSpy).called).to.be.true;
    });
  });
});
