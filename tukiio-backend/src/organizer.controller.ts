import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { AuthGuard } from './auth.guard.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { PrismaService } from './prisma.service.js';

@Controller('api/v1/organizer')
@UseGuards(AuthGuard)
export class OrganizerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async getDashboard(@Req() request: AuthenticatedRequest) {
    const ownerWhere = request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub };
    const orderWhere = request.user.role === 'ADMIN' ? {} : { event: { organizerId: request.user.sub } };
    const [events, paidSales, pendingOrders, payoutTotal, payoutRequests] = await Promise.all([
      this.prisma.event.findMany({ where: ownerWhere, include: { ticketTypes: { where: { active: true } } }, orderBy: { createdAt: 'desc' } }),
      this.prisma.order.aggregate({ where: { ...orderWhere, status: 'PAID' }, _sum: { totalAmount: true }, _count: { _all: true } }),
      this.prisma.order.count({ where: { ...orderWhere, status: 'PENDING' } }),
      this.prisma.payoutRequest.aggregate({ where: request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub }, _sum: { amount: true } }),
      this.prisma.payoutRequest.findMany({ where: request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub }, orderBy: { createdAt: 'desc' }, take: 20 }),
    ]);
    const ticketsSold = events.flatMap((event) => event.ticketTypes).reduce((sum, type) => sum + type.sold, 0);
    const ticketsReserved = events.flatMap((event) => event.ticketTypes).reduce((sum, type) => sum + type.reserved, 0);
    const grossSales = paidSales._sum.totalAmount ?? 0;
    const requestedPayouts = payoutTotal._sum.amount ?? 0;
    return {
      data: {
        summary: { eventCount: events.length, ticketsSold, ticketsReserved, grossSales, pendingOrders, requestedPayouts, availableBalance: Math.max(0, grossSales - requestedPayouts), simulated: true },
        events,
        payoutRequests,
      },
    };
  }

  @Get('orders')
  async getOrders(@Req() request: AuthenticatedRequest) {
    const where = request.user.role === 'ADMIN' ? {} : { event: { organizerId: request.user.sub } };
    const orders = await this.prisma.order.findMany({
      where,
      include: { event: { select: { id: true, title: true } }, items: { include: { ticketType: { select: { name: true } } } } },
      orderBy: { createdAt: 'desc' }, take: 100,
    });
    return { data: orders };
  }

  @Post('payout-requests')
  async requestPayout(@Req() request: AuthenticatedRequest, @Body() body: { amount?: number; provider?: string; phone?: string }) {
    const providers = ['MPESA', 'TIGOPESA', 'AIRTELMONEY', 'HALOPESA'];
    const phone = body.phone?.trim();
    if (!Number.isSafeInteger(body.amount) || (body.amount ?? 0) < 1 || !body.provider || !providers.includes(body.provider) || !phone || phone.length > 30) {
      throw new BadRequestException('Provide a positive integer amount, supported mobile provider and phone number');
    }
    const eventWhere = request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub };
    const [sales, requests] = await Promise.all([
      this.prisma.order.aggregate({ where: { event: eventWhere, status: 'PAID' }, _sum: { totalAmount: true } }),
      this.prisma.payoutRequest.aggregate({ where: request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub }, _sum: { amount: true } }),
    ]);
    const available = (sales._sum.totalAmount ?? 0) - (requests._sum.amount ?? 0);
    if (body.amount! > available) throw new BadRequestException('Requested amount exceeds the available demo balance');
    const payout = await this.prisma.payoutRequest.create({ data: { organizerId: request.user.sub, amount: body.amount!, provider: body.provider, phone } });
    return { data: payout, notice: 'Demo only. No money has been transferred.' };
  }

  @Get('payout-requests')
  async getPayoutRequests(@Req() request: AuthenticatedRequest) {
    const data = await this.prisma.payoutRequest.findMany({ where: request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub }, orderBy: { createdAt: 'desc' }, take: 100 });
    return { data };
  }

  @Get('events')
  getMyEvents(@Req() request: AuthenticatedRequest) {
    return this.prisma.event.findMany({
      where: request.user.role === 'ADMIN' ? {} : { organizerId: request.user.sub },
      include: { ticketTypes: true }, orderBy: { createdAt: 'desc' },
    });
  }

  @Patch('events/:eventId')
  async updateEvent(@Req() request: AuthenticatedRequest, @Param('eventId') eventId: string, @Body() body: {
    category?: string; title?: string; description?: string; startsAt?: string; venue?: string; image?: string | null; badge?: string | null;
  }) {
    const event = await this.prisma.event.findFirst({ where: request.user.role === 'ADMIN' ? { id: eventId } : { id: eventId, organizerId: request.user.sub } });
    if (!event) throw new BadRequestException('Event not found or you cannot edit it');

    const data: {
      category?: string; title?: string; description?: string; startsAt?: Date; venue?: string; image?: string | null; badge?: string | null;
    } = {};
    if (body.category !== undefined) {
      const value = body.category.trim();
      if (!value || value.length > 80) throw new BadRequestException('Category must contain 1 to 80 characters');
      data.category = value;
    }
    if (body.title !== undefined) {
      const value = body.title.trim();
      if (!value || value.length > 150) throw new BadRequestException('Title must contain 1 to 150 characters');
      data.title = value;
    }
    if (body.description !== undefined) {
      const value = body.description.trim();
      if (!value || value.length > 4000) throw new BadRequestException('Description must contain 1 to 4,000 characters');
      data.description = value;
    }
    if (body.venue !== undefined) {
      const value = body.venue.trim();
      if (!value || value.length > 200) throw new BadRequestException('Venue must contain 1 to 200 characters');
      data.venue = value;
    }
    if (body.startsAt !== undefined) {
      const startsAt = new Date(body.startsAt);
      if (!Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) throw new BadRequestException('Event date must be in the future');
      data.startsAt = startsAt;
    }
    if (body.image !== undefined) {
      const image = body.image?.trim() ?? '';
      if (image.length > 2048) throw new BadRequestException('Image URL is too long');
      if (image) {
        let imageUrl: URL;
        try { imageUrl = new URL(image); } catch { throw new BadRequestException('Image must be a valid HTTP or HTTPS URL'); }
        if (!['http:', 'https:'].includes(imageUrl.protocol)) throw new BadRequestException('Image must be a valid HTTP or HTTPS URL');
      }
      data.image = image || null;
    }
    if (body.badge !== undefined) data.badge = body.badge?.trim() || null;
    if (Object.keys(data).length === 0) throw new BadRequestException('Provide at least one event field to update');
    return this.prisma.event.update({ where: { id: event.id }, data, include: { ticketTypes: true } });
  }

  @Post('events')
  createEvent(@Req() request: AuthenticatedRequest, @Body() body: {
    category?: string; title?: string; description?: string; startsAt?: string; venue?: string; image?: string; badge?: string;
  }) {
    const category = body.category?.trim();
    const title = body.title?.trim();
    const description = body.description?.trim();
    const venue = body.venue?.trim();
    const startsAt = body.startsAt ? new Date(body.startsAt) : new Date('invalid');
    if (!category || !title || !description || !venue || !Number.isFinite(startsAt.getTime()) || startsAt <= new Date()) {
      throw new BadRequestException('category, title, description, a future startsAt and venue are required');
    }
    const slug = `${title.toLocaleLowerCase('en').normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48)}-${randomBytes(3).toString('hex')}`;
    return this.prisma.event.create({ data: {
      slug, organizerId: request.user.sub, category, title, description, startsAt, venue,
      image: body.image?.trim() || null, badge: body.badge?.trim() || null,
    }, include: { ticketTypes: true } });
  }

  @Patch('events/:eventId/publish')
  async publishEvent(@Req() request: AuthenticatedRequest, @Param('eventId') eventId: string) {
    const where = request.user.role === 'ADMIN' ? { id: eventId } : { id: eventId, organizerId: request.user.sub };
    const event = await this.prisma.event.findFirst({ where, include: { ticketTypes: { where: { active: true } } } });
    if (!event) throw new BadRequestException('Event not found');
    if (event.ticketTypes.length === 0) throw new BadRequestException('Add at least one ticket type before publishing');
    return this.prisma.event.update({ where: { id: eventId }, data: { status: 'PUBLISHED' } });
  }

  @Post('events/:eventId/ticket-types')
  async createTicketType(@Req() request: AuthenticatedRequest, @Param('eventId') eventId: string, @Body() body: {
    name?: string; description?: string; price?: number; quantity?: number;
  }) {
    const name = body.name?.trim();
    if (!name || !Number.isSafeInteger(body.price) || (body.price ?? -1) < 0 || (body.price ?? 0) > 200_000_000 || !Number.isSafeInteger(body.quantity) || (body.quantity ?? 0) < 1 || (body.quantity ?? 0) > 1_000_000) {
      throw new BadRequestException('Provide a name, price from 0 to 200,000,000 TZS, and quantity from 1 to 1,000,000');
    }
    const event = await this.prisma.event.findFirst({ where: request.user.role === 'ADMIN' ? { id: eventId } : { id: eventId, organizerId: request.user.sub } });
    if (!event || event.status !== 'DRAFT') throw new BadRequestException('A draft event owned by you is required');
    return this.prisma.ticketType.create({ data: {
      eventId, name, description: body.description?.trim() || null,
      price: body.price!, quantity: body.quantity!,
    } });
  }
}
