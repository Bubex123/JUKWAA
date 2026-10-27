import { BadRequestException, Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { AuthGuard } from './auth.guard.js';
import type { AuthenticatedRequest } from './auth.guard.js';
import { PrismaService } from './prisma.service.js';

@Controller('api/v1/checkin')
@UseGuards(AuthGuard)
export class CheckinController {
  constructor(private readonly prisma: PrismaService) {}

  @Post()
  async checkIn(@Req() request: AuthenticatedRequest, @Body() body: { qrPayload?: string }) {
    const [ticketId, signature, ...extra] = body.qrPayload?.split('.') ?? [];
    const secret = process.env.TICKET_SIGNING_SECRET ?? process.env.JWT_SECRET;
    if (!ticketId || !signature || extra.length || !secret || secret.length < 32) throw new BadRequestException('A valid ticket QR payload is required');
    const expected = createHmac('sha256', secret).update(ticketId).digest();
    let received: Buffer;
    try { received = Buffer.from(signature, 'base64url'); } catch { throw new BadRequestException('Invalid ticket QR payload'); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new BadRequestException('Invalid ticket QR payload');

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId }, include: { event: true } });
    if (!ticket) throw new BadRequestException('Ticket not found');
    if (request.user.role !== 'ADMIN' && ticket.event.organizerId !== request.user.sub) throw new BadRequestException('Ticket belongs to an event you cannot check in');
    if (ticket.status !== 'VALID') throw new BadRequestException(ticket.status === 'USED' ? 'Ticket has already been used' : 'Ticket is not valid');
    const result = await this.prisma.ticket.updateMany({
      where: { id: ticket.id, status: 'VALID' },
      data: { status: 'USED', checkedInAt: new Date(), checkedInById: request.user.sub },
    });
    if (result.count !== 1) throw new BadRequestException('Ticket has already been checked in');
    return { data: { ticketId: ticket.id, event: ticket.event.title, ticketType: ticket.ticketType, status: 'USED', checkedInAt: new Date().toISOString() } };
  }
}
