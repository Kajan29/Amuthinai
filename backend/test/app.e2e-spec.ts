import type { INestApplication } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import type { Server } from 'node:http';
import request from 'supertest';

import { AppModule } from 'src/app.module';

/**
 * Requires a reachable MongoDB — the same instance `docker compose up -d` provides. Point
 * MONGODB_URI at a throwaway database before running: these tests write real documents.
 */
describe('Amuthinai API (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api/v1');
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('rejects an unauthenticated request', async () => {
    await request(app.getHttpServer() as Server)
      .get('/api/v1/donations')
      .expect(401);
  });

  it('rejects a login with bad credentials', async () => {
    await request(app.getHttpServer() as Server)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@amuthinai.lk', password: 'wrongpassword' })
      .expect(401);
  });
});
