import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    const secret = configService.get<string>('JWT_SECRET');
    const isProduction = configService.get<string>('NODE_ENV') === 'production';
    const unsafeDefault = !secret || secret === 'secretKey' || secret === 'your-super-secret-jwt-key-change-this-in-production';
    if (isProduction && unsafeDefault) {
      throw new Error('JWT_SECRET must be set to a strong random value in production. Do not use default or example secrets.');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret || 'secretKey',
    });
  }

  async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
      isAdmin: payload.role === 'admin' || payload.role === 'super_admin'
    };
  }
}
