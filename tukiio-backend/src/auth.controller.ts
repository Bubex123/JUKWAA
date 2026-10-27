import { Body, Controller, Post } from '@nestjs/common';
import { AuthService } from './auth.service.js';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  register(@Body() body: { name?: string; email?: string; password?: string }) {
    return this.auth.register(body);
  }

  @Post('login')
  login(@Body() body: { email?: string; password?: string }) {
    return this.auth.login(body);
  }
}
