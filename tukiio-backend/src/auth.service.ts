import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { PrismaService } from './prisma.service.js';

export interface AuthClaims { sub: string; role: 'ORGANIZER' | 'ADMIN'; exp: number }

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(input: { name?: string; email?: string; password?: string }) {
    this.requireJwtSecret();
    const name = input.name?.trim();
    const email = input.email?.trim().toLowerCase();
    const password = input.password;
    if (!name || !email || !password || password.length < 12 || password.length > 200) {
      throw new BadRequestException('Provide a name, valid email and password of at least 12 characters');
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new BadRequestException('Email address is invalid');
    if (await this.prisma.user.findUnique({ where: { email } })) throw new ConflictException('Email is already registered');

    const salt = randomBytes(16).toString('hex');
    const passwordHash = `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
    let user;
    try {
      user = await this.prisma.user.create({ data: { name, email, passwordHash } });
    } catch (error) {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Email is already registered');
      }
      throw error;
    }
    return this.issue(user.id, user.role, { id: user.id, name: user.name, email: user.email, role: user.role });
  }

  async login(input: { email?: string; password?: string }) {
    this.requireJwtSecret();
    const email = input.email?.trim().toLowerCase();
    const user = email ? await this.prisma.user.findUnique({ where: { email } }) : null;
    const [salt, expectedHex] = user?.passwordHash.split(':') ?? [];
    const actual = scryptSync(input.password ?? '', salt ?? 'tukio-invalid-account-salt', 64);
    const expected = expectedHex ? Buffer.from(expectedHex, 'hex') : Buffer.alloc(64);
    if (!user || expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
      throw new UnauthorizedException('Email or password is incorrect');
    }
    return this.issue(user.id, user.role, { id: user.id, name: user.name, email: user.email, role: user.role });
  }

  verify(token: string): AuthClaims {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new UnauthorizedException('Authentication is not configured');
    const parts = token.split('.');
    if (parts.length !== 3) throw new UnauthorizedException('Invalid bearer token');
    const content = `${parts[0]}.${parts[1]}`;
    const expected = createHmac('sha256', secret).update(content).digest();
    let received: Buffer;
    try { received = Buffer.from(parts[2], 'base64url'); } catch { throw new UnauthorizedException('Invalid bearer token'); }
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) throw new UnauthorizedException('Invalid bearer token');
    try {
      const claims = JSON.parse(Buffer.from(parts[1], 'base64url').toString()) as AuthClaims;
      if (!claims.sub || claims.exp <= Math.floor(Date.now() / 1000)) throw new Error('expired');
      return claims;
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token');
    }
  }

  private issue(userId: string, role: AuthClaims['role'], user: object) {
    const secret = this.requireJwtSecret();
    const now = Math.floor(Date.now() / 1000);
    const expiresIn = process.env.JWT_EXPIRES_IN === '24h' ? 86400 : 43200;
    const head = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({ sub: userId, role, iat: now, exp: now + expiresIn })).toString('base64url');
    const content = `${head}.${body}`;
    const signature = createHmac('sha256', secret).update(content).digest('base64url');
    return { accessToken: `${content}.${signature}`, tokenType: 'Bearer', expiresIn, user };
  }

  private requireJwtSecret() {
    const secret = process.env.JWT_SECRET;
    if (!secret || secret.length < 32) throw new Error('JWT_SECRET must contain at least 32 characters');
    return secret;
  }
}
