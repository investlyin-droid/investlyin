import { Controller, Post, Body, HttpCode, HttpStatus, NotImplementedException } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { FirebaseLoginDto } from './dto/firebase-login.dto';
import { FirebaseRegisterDto } from './dto/firebase-register.dto';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Firebase Login - Only authentication method
   * All users must authenticate via Firebase
   */
  @Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 attempts per minute per IP
  @Post('firebase-login')
  async firebaseLogin(@Body() body: FirebaseLoginDto) {
    return this.authService.firebaseLogin(
      body.firebaseToken,
      body.email?.trim() || undefined,
      body.displayName?.trim() || undefined,
    );
  }

  /**
   * Firebase Register - Only registration method
   * All users must register via Firebase
   */
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10 registrations per minute per IP
  @Post('firebase-register')
  async firebaseRegister(@Body() body: FirebaseRegisterDto) {
    return this.authService.firebaseRegister(
      body.firebaseToken,
      body.email,
      body.displayName || '',
      body.firstName || '',
      body.lastName || '',
    );
  }

  /**
   * 2FA verification stub – Firebase auth does not use backend 2FA for login.
   * Returns 501 so frontend does not get 404 if it calls this.
   */
  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  verify2FA() {
    throw new NotImplementedException(
      '2FA login is not implemented for Firebase auth. Use profile settings for 2FA on API keys if needed.',
    );
  }
}
