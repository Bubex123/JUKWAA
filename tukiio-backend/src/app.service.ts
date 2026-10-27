import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

export interface EventSummary {
  id: string;
  category: string;
  title: string;
  description: string;
  date: string;
  startsAt: string;
  time: string;
  venue: string;
  price: number;
  currency: 'TZS';
  image: string;
  badge: string | null;
  ticketTypes: { id: string; name: string; price: number; available: number }[];
}

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  async getEvents(filters: { category?: string; search?: string; includePast?: boolean } = {}): Promise<EventSummary[]> {
    const category = filters.category?.trim().toLocaleLowerCase('sw');
    const search = filters.search?.trim().toLocaleLowerCase('sw');

    const rows = await this.prisma.event.findMany({
      where: {
        status: 'PUBLISHED',
        ...(!filters.includePast ? { startsAt: { gte: new Date() } } : {}),
        ...(category && category !== 'zote' ? { category: { equals: filters.category?.trim(), mode: 'insensitive' } } : {}),
        ...(search ? { OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { category: { contains: search, mode: 'insensitive' } },
          { venue: { contains: search, mode: 'insensitive' } },
        ] } : {}),
      },
      include: { ticketTypes: { where: { active: true }, orderBy: { price: 'asc' } } },
      orderBy: { startsAt: 'asc' },
      take: 100,
    });
    return rows.map((event) => this.toSummary(event));
  }

  async getEvent(id: string): Promise<EventSummary | undefined> {
    const where = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
      ? { id, status: 'PUBLISHED' as const }
      : { slug: id, status: 'PUBLISHED' as const };
    const event = await this.prisma.event.findFirst({
      where,
      include: { ticketTypes: { where: { active: true }, orderBy: { price: 'asc' } } },
    });
    return event ? this.toSummary(event) : undefined;
  }

  private toSummary(event: {
    id: string; slug: string; category: string; title: string; description: string;
    startsAt: Date; venue: string; image: string | null; badge: string | null;
    ticketTypes: { id: string; name: string; price: number; quantity: number; sold: number; reserved: number }[];
  }): EventSummary {
    const date = new Intl.DateTimeFormat('sw-TZ', { day: '2-digit', month: 'short', timeZone: 'Africa/Dar_es_Salaam' }).format(event.startsAt);
    return {
      id: event.slug, category: event.category, title: event.title, description: event.description,
      date, startsAt: event.startsAt.toISOString(), time: new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Dar_es_Salaam' }).format(event.startsAt),
      venue: event.venue, price: event.ticketTypes[0]?.price ?? 0, currency: 'TZS', image: event.image ?? '', badge: event.badge,
      ticketTypes: event.ticketTypes.map((type) => ({ id: type.id, name: type.name, price: type.price, available: type.quantity - type.sold - type.reserved })),
    };
  }
}
