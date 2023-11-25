import { expect } from 'chai';
import express, { Express } from 'express';
import mockFs from 'mock-fs';
import { Readable } from 'stream';
import supertest, { Response } from 'supertest';

import { api } from './api';
import { FileStore } from './file-store';

describe('api', () => {
  let store: FileStore;
  let app: Express;

  beforeEach(async () => {
    // Start each test with an empty file system.
    mockFs({
      docs: {
        'sample.txt': 'This is a sample file.',
        'other.txt': 'This is another sample file.',
      },
    });

    // Create a style instance with a style to test.
    store = new FileStore('/app/data');
    await store.init(0);
    await store.create(
      Readable.from('Simple Test Document', { encoding: 'utf-8' }),
      'testing.txt',
      'utf-8',
      'text/plain',
      'uuid812',
    );

    // Create a simplified express app.
    app = express();
    app.use('/content', api(store));
  });

  afterEach(async () => {
    await store.flush();
    mockFs.restore();
  });

  describe('POST /content', () => {
    describe('when no files are uploaded', () => {
      it('should respond with 400 error', (done) => {
        supertest(app)
          .post('/content')
          .field('foo', 'bar')
          .expect(400)
          .expect((res: Response) => {
            expect(res.body).property('statusCode').to.equal(400);
            expect(res.body)
              .property('message')
              .to.match(/^Bad Request/i);
          })
          .end(done);
      });
    });

    describe('when request cannot be parsed', () => {
      it('should respond with 400 error', (done) => {
        supertest(app)
          .post('/content')
          .expect(400)
          .expect((res: Response) => {
            expect(res.body).property('statusCode').to.equal(400);
            expect(res.body)
              .property('message')
              .to.match(/^Bad Request/i);
          })
          .end(done);
      });
    });
  });

  describe('when files are uploaded', () => {
    it('should respond with 200', (done) => {
      supertest(app)
        .post('/content')
        .attach('file', 'docs/sample.txt', 'sample.txt')
        .attach('file', 'docs/other.txt', 'other.txt')
        .expect(200)
        .end(done);
    });
  });

  describe('GET /content', () => {
    it('should return a list of available files', (done) => {
      supertest(app)
        .get('/content')
        .expect(200)
        .expect('Content-Type', /json/)
        .end(done);
    });
  });

  describe('GET /content/:entityId', () => {
    describe('when file does not exist', () => {
      it('should respond with a 404', (done) => {
        supertest(app)
          .get('/content/guid812')
          .expect(404)
          .expect('Content-Type', /json/)
          .expect({
            statusCode: 404,
            message: 'Not Found',
          })
          .end(done);
      });
    });

    describe('when file exists', () => {
      it('should respond with file contents', (done) => {
        supertest(app)
          .get('/content/uuid812')
          .expect(200)
          .expect((req) => (req.body = 'Simple Test Document'))
          .end(done);
      });
    });
  });

  describe('DELETE /content/entityId', () => {
    describe('when file exists', () => {
      it('should respond with 204', (done) => {
        supertest(app).delete(`/content/uuid812`).expect(204).end(done);
      });
    });

    describe('when file does not exist', () => {
      it('should respond with 204', (done) => {
        supertest(app).delete(`/content/guid812`).expect(204).end(done);
      });
    });
  });
});
