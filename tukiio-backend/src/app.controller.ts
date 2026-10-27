import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller('api/v1')
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth() {
    return { status: 'ok', service: 'tukiio-backend' };
  }

  @Get('events')
  async getEvents(@Query('category') category?: string, @Query('search') search?: string, @Query('includePast') includePast?: string) {
    return { data: await this.appService.getEvents({ category, search, includePast: includePast === 'true' }) };
  }

  @Get('events/:id')
  async getEvent(@Param('id') id: string) {
    const event = await this.appService.getEvent(id);
    if (!event) throw new NotFoundException('Event not found');
    return { data: event };
  }
}
