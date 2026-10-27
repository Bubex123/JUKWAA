import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types.js';
import { AppModule } from './../src/app.module.js';
import { PrismaService } from './../src/prisma.service.js';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).overrideProvider(PrismaService).useValue({
      event: {
        findMany: async () => Array.from({ length: 6 }, (_, index) => ({
          id: `event-${index}`, slug: `event-${index}`, category: 'Muziki', title: 'Sample', description: '',
          startsAt: new Date(), venue: '', image: null, badge: null,
          ticketTypes: [{ id: 'ticket-type', name: 'General', price: 1000, quantity: 10, sold: 0 }],
        })),
        findFirst: async () => null,
      },
      $connect: async () => undefined,
      $disconnect: async () => undefined,
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/v1/health (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/health')
      .expect(200)
      .expect({ status: 'ok', service: 'tukiio-backend' });
  });

  it('/api/v1/events (GET)', () => {
    return request(app.getHttpServer())
      .get('/api/v1/events')
      .expect(200)
      .expect(({ body }) => {
        expect(body.data).toHaveLength(6);
        expect(body.data[0].currency).toBe('TZS');
      });
  });

  afterEach(async () => {
    await app.close();
  });
});
