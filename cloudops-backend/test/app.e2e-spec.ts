import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { setupApp } from '../src/setup-app.js';

const hasDb = Boolean(process.env.DATABASE_URL && process.env.JWT_SECRET);

describe.skipIf(!hasDb)('API security and validation (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const password = 'e2e-password-1';
  const tokens: Record<string, string> = {};
  const emails = {
    ADMIN: 'e2e-admin@test.local',
    DEVOPS: 'e2e-devops@test.local',
    VIEWER: 'e2e-viewer@test.local',
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    setupApp(app);
    await app.init();
    prisma = app.get(PrismaService);

    const passwordHash = await bcrypt.hash(password, 4);
    for (const [role, email] of Object.entries(emails)) {
      await prisma.user.upsert({
        where: { email },
        update: { passwordHash, active: true },
        create: { email, name: role, role: role as 'ADMIN', passwordHash },
      });
    }
  });

  afterAll(async () => {
    await prisma.user.deleteMany({
      where: { email: { in: Object.values(emails) } },
    });
    await app.close();
  });

  it('GET /health is public', async () => {
    const res = await request(app.getHttpServer()).get('/health').expect(200);
    expect(res.body).toMatchObject({ status: 'ok', database: 'up' });
  });

  it('rejects calls without a token (401) and with a bad one (401)', async () => {
    await request(app.getHttpServer()).get('/servers').expect(401);
    await request(app.getHttpServer())
      .get('/servers')
      .set('Authorization', 'Bearer not-a-jwt')
      .expect(401);
  });

  it('logs in each role and never returns the hash', async () => {
    for (const [role, email] of Object.entries(emails)) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ email, password })
        .expect(200);
      expect(res.body.user).not.toHaveProperty('passwordHash');
      tokens[role] = res.body.accessToken;
    }
  });

  it('enforces the permission matrix with 403', async () => {
    const http = app.getHttpServer();
    await request(http)
      .get('/users')
      .set('Authorization', `Bearer ${tokens.VIEWER}`)
      .expect(403);
    await request(http)
      .get('/users')
      .set('Authorization', `Bearer ${tokens.DEVOPS}`)
      .expect(403);
    await request(http)
      .get('/users')
      .set('Authorization', `Bearer ${tokens.ADMIN}`)
      .expect(200);
    await request(http)
      .post('/teams')
      .set('Authorization', `Bearer ${tokens.VIEWER}`)
      .send({ name: 'x' })
      .expect(403);
    await request(http)
      .get('/servers')
      .set('Authorization', `Bearer ${tokens.VIEWER}`)
      .expect(200);
  });

  it('returns 400 with field-level messages for invalid input', async () => {
    const res = await request(app.getHttpServer())
      .post('/servers')
      .set('Authorization', `Bearer ${tokens.DEVOPS}`)
      .send({
        name: 'x',
        provider: 'AWS',
        region: 'r',
        cpu: -1,
        ramGb: 8,
        storageGb: 10,
        ipAddress: 'nope',
        projectId: 'p',
        environmentId: 'e',
      })
      .expect(400);
    expect(res.body).toMatchObject({
      statusCode: 400,
      error: 'Bad Request',
      path: '/servers',
    });
    expect(res.body.message).toEqual(
      expect.arrayContaining([
        'cpu must not be less than 1',
        'ipAddress must be an ip address',
      ]),
    );
  });

  it('paginates lists with a meta block', async () => {
    const res = await request(app.getHttpServer())
      .get('/projects?page=1&limit=5')
      .set('Authorization', `Bearer ${tokens.VIEWER}`)
      .expect(200);
    expect(res.body.meta).toMatchObject({ page: 1, limit: 5 });
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('serves Swagger UI', async () => {
    await request(app.getHttpServer()).get('/api/docs').expect(200);
    await request(app.getHttpServer()).get('/api/docs-json').expect(200);
  });
});
