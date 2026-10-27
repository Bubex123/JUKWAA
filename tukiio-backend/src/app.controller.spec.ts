import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { PrismaService } from './prisma.service.js';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [AppService, { provide: PrismaService, useValue: { event: { findMany: async () => [{ category: 'Muziki', title: 'Sample', description: '', startsAt: new Date(), venue: '', image: null, badge: null, slug: 'sample', ticketTypes: [{ id: '1', name: 'General', price: 1000, quantity: 10, sold: 0 }] }], findFirst: async () => null } } }],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  it('returns events in the API data envelope', async () => {
    const result = await appController.getEvents();
    expect(result.data.length).toBeGreaterThan(0);
    expect(result.data[0].currency).toBe('TZS');
  });
});
