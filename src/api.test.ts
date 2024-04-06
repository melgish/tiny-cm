import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { Readable } from 'node:stream';
import mockFs from 'mock-fs';
import { api } from './api';
import { FileStore } from './file-store';

vi.mock('./logger');

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
      it('should respond with 400 error', async () => {
        const rs = await request(app)
          .post('/content')
          .field('foo', 'bar')
          .expect(400);

        expect(rs.statusCode).toEqual(400);
        expect(rs.body.message).toMatch(/^Bad Request/i);
      });
    });

    describe('when request cannot be parsed', () => {
      it('should respond with 400 error', async () => {
        const rs = await request(app).post('/content');

        expect(rs.statusCode).toEqual(400);
        expect(rs.body.message).toMatch(/^Bad Request/i);
      });
    });

    describe('when files are uploaded', () => {
      it('should respond with 200', async () => {
        const rs = await request(app)
          .post('/content')
          .attach('file', 'docs/sample.txt', 'sample.txt')
          .attach('file', 'docs/other.txt', 'other.txt');

        expect(rs.statusCode).toEqual(200);
      });
    });
  });

  describe('GET /content', () => {
    it('should return a list of available files', async () => {
      const rs = await request(app).get('/content');

      expect(rs.statusCode).toEqual(200);
      expect(rs.body[0].fileName).toBe('testing.txt');
    });
  });

  describe('GET /content/:entityId', () => {
    describe('when file does not exist', () => {
      it('should respond with a 404', async () => {
        const rs = await request(app).get('/content/guid812');

        expect(rs.statusCode).toEqual(404);
        expect(rs.body).toMatchInlineSnapshot(`
          {
            "message": "Not Found",
            "statusCode": 404,
          }
        `);
      });
    });

    describe('when file exists', () => {
      it('should respond with file contents', async () => {
        const rs = await request(app).get('/content/uuid812');

        expect(rs.statusCode).toEqual(200);
        expect(rs.text).toEqual('Simple Test Document');
      });
    });
  });

  describe('DELETE /content/entityId', () => {
    describe('when file exists', () => {
      it('should respond with 204', async () => {
        const rs = await request(app).delete(`/content/uuid812`);

        expect(rs.statusCode).toEqual(204);
      });
    });

    describe('when file does not exist', () => {
      it('should respond with 204', async () => {
        const rs = await request(app).delete(`/content/guid812`);

        expect(rs.statusCode).toEqual(204);
      });
    });

    describe('when action throws an error', () => {
      it('should respond with a 400', async () => {
        vi.spyOn(store, 'find').mockRejectedValue('kaboom');
        const rs = await request(app).delete(`/content/uuid812`);

        expect(store.find).toHaveBeenCalled();
        expect(rs.statusCode).toEqual(400);
      });
    });
  });
});
