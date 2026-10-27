import { BadRequestException, Body, Controller, Get, Headers, Param, Post, UnauthorizedException } from '@nestjs/common';
import { createHash, createHmac, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service.js';

const hash = (value: string) => createHash('sha256').update(value).digest('hex');

@Controller('api/v1')
export class OrdersController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('orders')
  async createOrder(@Body() body: {
    eventId?: string; ticketTypeId?: string; quantity?: number; buyerName?: string;
    buyerEmail?: string; buyerPhone?: string; paymentProvider?: string;
  }) {
    const quantity = Number.isSafeInteger(body.quantity) ? body.quantity! : 0;
    const name = body.buyerName?.trim();
    const phone = body.buyerPhone?.trim();
    const allowedProviders = ['MPESA', 'TIGOPESA', 'AIRTELMONEY', 'HALOPESA'];
    if (!body.eventId || !body.ticketTypeId || quantity < 1 || quantity > 10 || !name || !phone || !body.paymentProvider || !allowedProviders.includes(body.paymentProvider)) {
      throw new BadRequestException('eventId, ticketTypeId, quantity (1 to 10), buyerName, buyerPhone and a supported paymentProvider are required');
    }
    if (body.buyerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.buyerEmail)) throw new BadRequestException('buyerEmail is invalid');

    await this.releaseExpiredReservations();

    const eventWhere = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.eventId)
      ? { id: body.eventId, status: 'PUBLISHED' as const }
      : { slug: body.eventId, status: 'PUBLISHED' as const };
    const event = await this.prisma.event.findFirst({ where: eventWhere });
    const ticketType = event ? await this.prisma.ticketType.findFirst({ where: { id: body.ticketTypeId, eventId: event.id, active: true } }) : null;
    if (!event || !ticketType) throw new BadRequestException('Event or ticket type is unavailable');

    const accessToken = randomBytes(32).toString('base64url');
    const orderId = randomUUID();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
    const order = await this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<Array<{ id: string }>>`
        UPDATE "TicketType"
        SET "reserved" = "reserved" + ${quantity}
        WHERE "id" = ${ticketType.id}::uuid
          AND "active" = true
          AND "quantity" - "sold" - "reserved" >= ${quantity}
        RETURNING "id"
      `;
      if (rows.length !== 1) throw new BadRequestException('Not enough tickets are available');
      return tx.order.create({ data: {
        id: orderId, eventId: event.id, buyerName: name, buyerEmail: body.buyerEmail?.trim().toLowerCase() ?? null,
        buyerPhone: phone, totalAmount: ticketType.price * quantity, accessTokenHash: hash(accessToken),
        expiresAt, paymentProvider: body.paymentProvider,
        items: { create: { ticketTypeId: ticketType.id, quantity, unitPrice: ticketType.price } },
        payment: { create: { provider: body.paymentProvider!, amount: ticketType.price * quantity } },
      } });
    });
    return {
      data: { id: order.id, status: order.status, amount: order.totalAmount, currency: order.currency, expiresAt: order.expiresAt },
      accessToken,
      payment: { provider: body.paymentProvider, status: 'PENDING', instructions: 'Payment provider checkout is not configured yet. Do not send money until a provider integration is enabled.' },
    };
  }

  @Get('orders/:id')
  async getOrder(@Param('id') id: string, @Headers('x-order-token') accessToken?: string) {
    if (!accessToken) throw new UnauthorizedException('X-Order-Token header required');
    const order = await this.prisma.order.findUnique({
      where: { id }, include: { event: { select: { title: true, startsAt: true, venue: true } }, items: { include: { ticketType: true } }, tickets: true, payment: true },
    });
    if (!order || !this.constantCompare(hash(accessToken), order.accessTokenHash)) throw new UnauthorizedException('Invalid order access token');
    const secret = process.env.TICKET_SIGNING_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('TICKET_SIGNING_SECRET or JWT_SECRET must contain at least 32 characters');
    return { data: {
      id: order.id, status: order.status, amount: order.totalAmount, currency: order.currency,
      event: order.event, expiresAt: order.expiresAt, payment: order.payment,
      tickets: order.tickets.map((ticket) => {
        const signature = createHmac('sha256', secret).update(ticket.id).digest('base64url');
        return { id: ticket.id, code: ticket.code, type: ticket.ticketType, status: ticket.status, qrPayload: `${ticket.id}.${signature}` };
      }),
    } };
  }

  @Post('orders/:id/simulate-payment')
  async simulatePayment(@Param('id') id: string, @Headers('x-order-token') accessToken?: string) {
    if (process.env.NODE_ENV === 'production') throw new BadRequestException('Payment simulation is disabled in production');
    if (!accessToken) throw new UnauthorizedException('X-Order-Token header required');
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true, tickets: true, payment: true } });
    if (!order || !this.constantCompare(hash(accessToken), order.accessTokenHash)) throw new UnauthorizedException('Invalid order access token');
    if (order.status === 'PAID') return { data: { id: order.id, status: order.status }, simulation: true };
    if (order.status !== 'PENDING' || order.expiresAt <= new Date()) throw new BadRequestException('This reservation has expired or is no longer payable');

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.updateMany({ where: { id: order.id, status: 'PENDING', expiresAt: { gt: new Date() } }, data: { status: 'PAID', paidAt: new Date(), providerRef: `SIM-${order.id}` } });
      if (updated.count !== 1) throw new BadRequestException('This reservation has expired or is no longer payable');
      await tx.paymentAttempt.update({ where: { orderId: order.id }, data: { status: 'SUCCEEDED', providerReference: `SIM-${order.id}`, rawStatus: 'SIMULATION_ONLY_NO_MONEY_TRANSFERRED' } });
      for (const item of order.items) {
        await tx.ticketType.update({ where: { id: item.ticketTypeId }, data: { reserved: { decrement: item.quantity }, sold: { increment: item.quantity } } });
        const type = await tx.ticketType.findUniqueOrThrow({ where: { id: item.ticketTypeId } });
        await tx.ticket.createMany({ data: Array.from({ length: item.quantity }, () => {
          const ticketId = randomUUID();
          return { id: ticketId, code: `TK-${randomBytes(5).toString('hex').toUpperCase()}`, eventId: order.eventId, orderId: order.id, ticketType: type.name };
        }) });
      }
    });
    return { data: { id: order.id, status: 'PAID' }, simulation: true, notice: 'No money was transferred.' };
  }

  @Post('payments/webhook')
  async paymentWebhook(@Body() body: {
    eventId?: string; orderId?: string; providerReference?: string; amount?: number; status?: string;
  }, @Headers('x-payment-signature') signature?: string) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!secret || secret.length < 32) throw new UnauthorizedException('Payment webhook is not configured');
    const expected = createHmac('sha256', secret).update(JSON.stringify(body)).digest();
    let received: Buffer;
    try { received = Buffer.from(signature ?? '', 'hex'); } catch { throw new UnauthorizedException('Invalid webhook signature'); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new UnauthorizedException('Invalid webhook signature');
    if (!body.eventId || !body.orderId || !body.providerReference || !Number.isSafeInteger(body.amount) || !['paid', 'failed'].includes(body.status ?? '')) {
      throw new BadRequestException('Webhook eventId, orderId, providerReference, integer amount and paid/failed status are required');
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        await tx.paymentWebhook.create({ data: { provider: 'generic', eventId: body.eventId!, payloadHash: hash(JSON.stringify(body)) } });
        const order = await tx.order.findUnique({ where: { id: body.orderId }, include: { items: true, tickets: true } });
        if (!order || order.totalAmount !== body.amount) throw new BadRequestException('Order was not found or amount does not match');
        if (order.status !== 'PENDING') return;
        if (body.status === 'paid' && order.expiresAt > new Date()) {
          await tx.order.update({ where: { id: order.id }, data: { status: 'PAID', paidAt: new Date(), providerRef: body.providerReference } });
          await tx.paymentAttempt.update({ where: { orderId: order.id }, data: { status: 'SUCCEEDED', providerReference: body.providerReference, rawStatus: 'paid' } });
          for (const item of order.items) {
            await tx.ticketType.update({ where: { id: item.ticketTypeId }, data: { reserved: { decrement: item.quantity }, sold: { increment: item.quantity } } });
            const type = await tx.ticketType.findUniqueOrThrow({ where: { id: item.ticketTypeId } });
            await tx.ticket.createMany({ data: Array.from({ length: item.quantity }, () => {
              const id = randomUUID();
              return { id, code: `TK-${randomBytes(5).toString('hex').toUpperCase()}`, eventId: order.eventId, orderId: order.id, ticketType: type.name };
            }) });
          }
        } else {
          await tx.order.update({ where: { id: order.id }, data: { status: 'CANCELLED' } });
          const latePayment = body.status === 'paid';
          await tx.paymentAttempt.update({ where: { orderId: order.id }, data: { status: latePayment ? 'SUCCEEDED' : 'FAILED', providerReference: body.providerReference, rawStatus: latePayment ? 'paid_late_refund_required' : body.status } });
          for (const item of order.items) await tx.ticketType.update({ where: { id: item.ticketTypeId }, data: { reserved: { decrement: item.quantity } } });
        }
      });
      return { received: true };
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002' && 'meta' in error) {
        const target = (error.meta as { target?: unknown }).target;
        if ((Array.isArray(target) && target.includes('eventId')) || (typeof target === 'string' && target.includes('eventId'))) {
          return { received: true, duplicate: true };
        }
      }
      throw error;
    }
  }

  private constantCompare(a: string, b: string) {
    const left = Buffer.from(a); const right = Buffer.from(b);
    return left.length === right.length && timingSafeEqual(left, right);
  }

  private async releaseExpiredReservations() {
    const expiredOrders = await this.prisma.order.findMany({
      where: { status: 'PENDING', expiresAt: { lte: new Date() } },
      include: { items: true }, take: 100,
    });
    for (const order of expiredOrders) {
      await this.prisma.$transaction(async (tx) => {
        const result = await tx.order.updateMany({
          where: { id: order.id, status: 'PENDING', expiresAt: { lte: new Date() } },
          data: { status: 'CANCELLED' },
        });
        if (result.count !== 1) return;
        for (const item of order.items) await tx.ticketType.update({ where: { id: item.ticketTypeId }, data: { reserved: { decrement: item.quantity } } });
      });
    }
  }
}
