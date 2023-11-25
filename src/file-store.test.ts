import { existsSync } from 'node:fs';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { Readable } from 'stream';

import { logger } from './logger';
import { Meta, MetaMap } from './meta';

import { FileStore } from './file-store';

import { expect } from 'chai';
import { SinonSpy, SinonStub, spy, stub } from 'sinon';

class TestFileStore extends FileStore {
  // Make public for testing updates
  public metaData: MetaMap;
  // Make public for testing save failures.
  public metaPath: string;
  // Make public for testing save failures.
  public save(force: boolean): Promise<void> {
    return super.save(force);
  }
}

describe('FileStore', () => {
  let tmpDir: string;
  let contentPath: string;
  let store: TestFileStore;

  beforeEach(async () => {
    // After upgrade, using mock-fs for FileStore tests stopped working.
    // Instead use a real temporary folder.
    //
    // Pre-load it with data
    tmpDir = await mkdtemp(join(tmpdir(), 'tiny-cm-test'));
    (contentPath = join(tmpDir, 'uuid812.txt')),
      await writeFile(contentPath, 'THIS IS A TEST FILE', 'utf-8');
    await writeFile(
      join(tmpDir, 'metadata.json'),
      JSON.stringify({
        uuid812: {
          entityId: 'uuid812',
          contentPath,
          mimeType: 'text/plain',
          encoding: 'utf-8',
          fileName: 'test-file.txt',
        },
      }),
      'utf-8',
    );

    store = new TestFileStore(tmpDir);
    await store.init(0);
  });

  afterEach(async () => {
    if (tmpDir) {
      await rm(tmpDir, { recursive: true });
    }
  });

  describe('size (getter)', () => {
    it('should return number items in store', () => {
      expect(store.size).to.equal(1);
    });
  });

  describe('values (getter)', () => {
    it('should return array of metadata', () => {
      expect(store.values).to.eql([
        {
          entityId: 'uuid812',
          contentPath,
          mimeType: 'text/plain',
          encoding: 'utf-8',
          fileName: 'test-file.txt',
        },
      ]);
    });
  });

  describe('create', () => {
    let file: Readable;
    beforeEach(() => {
      file = Readable.from(['test-string']);
    });
    describe('when save succeeds', () => {
      it('should return metadata', async () => {
        // create a file stream to read
        const meta = await store.create(
          file,
          'test-string',
          'utf-8',
          'text/plain',
        );

        expect(meta).to.exist;
      });
    });
  });

  describe('delete', () => {
    describe('when file exists', () => {
      it('should delete the file', async () => {
        await store.delete('uuid812');

        expect(existsSync(contentPath)).to.be.false;
      });
    });

    describe('when file does not exist', () => {
      it('should not error', () => {
        expect(async () => await store.delete('uuid813')).not.to.throw();
      });
    });
  });

  describe('flush', () => {
    let error: SinonStub;
    let save: SinonSpy;

    beforeEach(() => {
      error = stub(logger, 'error');
      save = spy(store, 'save');
    });

    afterEach(() => {
      error.restore();
      save.restore();
    });

    describe('when save succeeds', () => {
      it('should create the file', async () => {
        await store.flush();

        expect(save.called).to.be.true;
        expect(existsSync(store.metaPath)).to.be.true;
        expect(error.called).to.be.false;
      });
    });

    describe('if save fails', () => {
      // Testing the underlying behavior o
      it('should log the failure', async () => {
        // hack the style into an invalid state
        store.metaPath = null!;

        await store.flush();

        expect(save.called).to.be.true;
        expect(error.called).to.be.true;
      });
    });
  });

  describe('init', () => {
    // Make sure that timeout started by init is stopped.
    afterEach(async () => await store.flush());

    describe('when folder  does not exist', () => {
      beforeEach(async () => {
        await rm(tmpDir, { recursive: true });
      });

      it('should init empty metadata', async () => {
        expect(existsSync(store.metaPath)).to.be.false;
        await store.init(1);
        expect(existsSync(store.metaPath)).to.be.true;
      });
    });
  });

  describe('list', () => {
    it('should return array of metadata', () => {
      expect(store.list()).to.eql([
        {
          entityId: 'uuid812',
          contentPath,
          mimeType: 'text/plain',
          encoding: 'utf-8',
          fileName: 'test-file.txt',
        },
      ]);
    });
  });

  describe('save', () => {
    describe('when data is clean', () => {
      it('should not save', async () => {
        await rm(store.metaPath, { recursive: true });

        await store.save(false);

        expect(existsSync(store.metaPath)).to.be.false;
      });
    });
  });

  describe('update', () => {
    beforeEach(() => {
      store.metaData = {};
    });
    describe('when meta includes an entityId', () => {
      it('should add entity to metaData', () => {
        const entityId = 'testId';
        const meta: Meta = {
          entityId,
          contentPath: 'data/guido.txt',
          encoding: 'utf-8',
          fileName: 'guido.txt',
          mimeType: 'text/plain',
        };

        expect(store.update(meta)).to.equal(meta);
        expect(store.metaData[entityId]).to.equal(meta);
      });
    });

    describe('when meta does not have entityId', () => {
      it('should not add to map', () => {
        const meta: Meta = {
          contentPath: 'data/guido.txt',
          encoding: 'utf-8',
          fileName: 'guido.txt',
          mimeType: 'text/plain',
        };

        expect(store.update(meta)).to.equal(meta);
        expect(store.metaData).to.eql({});
      });
    });
  });
});
