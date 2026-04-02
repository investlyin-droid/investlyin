import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtStrategy } from './strategies/jwt.strategy';
import { FirebaseService } from './firebase.service';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        const isProduction = configService.get<string>('NODE_ENV') === 'production';
        const defaultSecrets = ['secretKey', 'your-super-secret-jwt-key-change-this-in-production'];
        if (isProduction && (!secret || defaultSecrets.includes(secret))) {
          throw new Error(
            'JWT_SECRET must be set to a strong random value in production (e.g. openssl rand -base64 32).',
          );
        }
        return {
          secret: secret || 'secretKey',
          signOptions: { expiresIn: '60m' },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [AuthService, FirebaseService, JwtStrategy],
  controllers: [AuthController],
  exports: [AuthService, FirebaseService, JwtModule],
})
export class AuthModule {}
