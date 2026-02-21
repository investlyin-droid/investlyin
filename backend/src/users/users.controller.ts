import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FirestoreUsersService } from './firestore-users.service';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';
@Controller('users')
@UseGuards(AuthGuard('jwt'))
export class UsersController {
  constructor(private usersService: FirestoreUsersService) {}

  @Get('profile')
  async getProfile(@Request() req) {
    const profile = await this.usersService.getProfile(req.user.userId);
    if (!profile) {
      throw new NotFoundException('User not found');
    }
    return profile;
  }

  @Put('change-password')
  async changePassword(
    @Request() req,
    @Body() _body: { currentPassword: string; newPassword: string },
  ) {
    throw new BadRequestException(
      'Password is managed by Firebase. Change it in your account settings or Firebase Auth.',
    );
  }

  @Post('2fa/setup')
  async setup2FA(@Request() req) {
    // Security: Get user from authenticated JWT token (ensures user isolation)
    const userId = req.user.userId;
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Security: Generate unique secret for THIS user only
    const secret = speakeasy.generateSecret({
      name: `bitXtrade:${user.email}`, // User-specific label
      issuer: 'bitXtrade',
      length: 32, // Increased length for better security
    });

    await this.usersService.updateUserDoc(userId, {
      twoFactorSecret: secret.base32,
      twoFactorEnabled: false,
    });

    const otpauthUrl = speakeasy.otpauthURL({
      secret: secret.ascii || secret.base32,
      label: user.email,
      issuer: 'TradingPlatform',
      encoding: 'ascii',
    });

    let qrCodeDataUrl = '';
    try {
      qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl, { width: 200 });
    } catch {
      // fallback: return otpauth URL only
    }

    return {
      secret: secret.base32,
      qrCode: qrCodeDataUrl || otpauthUrl,
      message:
        '2FA setup initiated. Scan the QR code with your authenticator app.',
    };
  }

  @Post('2fa/verify')
  async verify2FA(@Request() req, @Body() body: { code: string }) {
    // Security: Get user from authenticated JWT token (ensures user isolation)
    const userId = req.user.userId;
    const user = await this.usersService.findByIdWith2FA(userId);
    
    // Security: Verify user exists
    if (!user) {
      throw new NotFoundException('User not found');
    }
    
    // Security: Ensure THIS user has their own 2FA secret
    if (!(user as any).twoFactorSecret) {
      throw new BadRequestException('2FA not set up for this account');
    }

    // Security: Verify code against THIS user's secret only (user-specific verification)
    const verified = speakeasy.totp.verify({
      secret: (user as any).twoFactorSecret, // User's own secret, isolated per account
      encoding: 'base32',
      token: body.code,
      window: 1,
    });

    if (!verified) {
      throw new BadRequestException('Invalid 2FA code');
    }
    await this.usersService.updateUserDoc(userId, { twoFactorEnabled: true });
    return { verified: true, message: '2FA verified and enabled successfully' };
  }

  @Post('2fa/disable')
  async disable2FA(@Request() req) {
    const userId = req.user.userId;
    await this.usersService.disable2FAForUser(userId);
    return { message: '2FA disabled successfully' };
  }

  @Post('kyc/submit')
  async submitKYC(
    @Request() req,
    @Body() body: { documentType: string; documentNumber: string; documentImage?: string },
  ) {
    if (!body.documentType || !body.documentNumber) {
      throw new BadRequestException('Document type and number are required');
    }

    const validDocumentTypes = ['passport', 'drivers_license', 'national_id'];
    if (!validDocumentTypes.includes(body.documentType)) {
      throw new BadRequestException('Invalid document type');
    }

    if (body.documentNumber.trim().length < 3) {
      throw new BadRequestException('Document number must be at least 3 characters');
    }

    if (!body.documentImage) {
      throw new BadRequestException('Document image is required');
    }

    // Validate base64 image/PDF format
    if (!body.documentImage.startsWith('data:image/') && !body.documentImage.startsWith('data:application/pdf')) {
      throw new BadRequestException('Invalid file format. Please upload a valid image or PDF file.');
    }

    const fullUser = await this.usersService.findById(req.user.userId);
    if (!fullUser) {
      throw new NotFoundException('User not found');
    }

    const uploadBase = process.env.UPLOAD_DIR || 'uploads';
    const dir = path.join(process.cwd(), uploadBase, 'kyc-documents');

    let documentUrl: string | undefined;
    if (body.documentImage) {
      try {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      } catch (e: any) {
        throw new BadRequestException(
          `Upload directory unavailable: ${e?.message || 'cannot create kyc-documents folder'}. Check UPLOAD_DIR in .env.`,
        );
      }

      const base64Data = body.documentImage.replace(/^data:(image\/\w+|application\/pdf);base64,/, '');
      const buffer = Buffer.from(base64Data, 'base64');

      const mimeMatch = body.documentImage.match(/^data:(image\/(\w+)|application\/(pdf));base64,/);
      let ext = '.png';
      if (mimeMatch) {
        if (mimeMatch[2] === 'pdf' || body.documentImage.includes('application/pdf')) {
          ext = '.pdf';
        } else {
          ext = `.${mimeMatch[2] || 'png'}`;
        }
      }
      const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(ext.toLowerCase()) ? ext : '.png';

      const filename = `${req.user.userId}_${Date.now()}_${randomUUID().slice(0, 8)}${safeExt}`;
      const filepath = path.join(dir, filename);
      try {
        fs.writeFileSync(filepath, buffer);
      } catch (e: any) {
        throw new BadRequestException(
          `Failed to save KYC document: ${e?.message || 'disk error'}. Check UPLOAD_DIR and permissions.`,
        );
      }
      documentUrl = `/uploads/kyc-documents/${filename}`;
    }
    
    await this.usersService.updateUserDoc(req.user.userId, {
      kycStatus: 'pending',
      kycDocumentType: body.documentType,
      kycDocumentNumber: body.documentNumber,
      kycDocumentUrl: documentUrl,
      kycSubmittedAt: new Date(),
    });

    return {
      message:
        'KYC documents submitted successfully. Your verification is pending review.',
      status: 'pending',
    };
  }

  @Post('api-keys/generate')
  async generateApiKey(
    @Request() req,
    @Body() body: { name: string; permissions?: string[] },
  ) {
    if (!body.name || !body.name.trim()) {
      throw new BadRequestException('API key name is required');
    }

    const trimmedName = body.name.trim();
    if (trimmedName.length < 3) {
      throw new BadRequestException('API key name must be at least 3 characters');
    }

    if (trimmedName.length > 50) {
      throw new BadRequestException('API key name must be less than 50 characters');
    }

    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Check for duplicate names
    const existingKeys = (user.apiKeys || []) as any[];
    if (existingKeys.some((k: any) => k.name.toLowerCase() === trimmedName.toLowerCase())) {
      throw new BadRequestException('An API key with this name already exists');
    }

    // Limit number of API keys per user (max 10)
    if (existingKeys.length >= 10) {
      throw new BadRequestException('Maximum of 10 API keys allowed per account');
    }

    // Validate permissions
    const validPermissions = ['read', 'trade', 'withdraw'];
    const permissions = body.permissions || ['read', 'trade'];
    const invalidPermissions = permissions.filter(p => !validPermissions.includes(p));
    if (invalidPermissions.length > 0) {
      throw new BadRequestException(`Invalid permissions: ${invalidPermissions.join(', ')}`);
    }

    // Generate secure API key
    const randomPart1 = Math.random().toString(36).substring(2, 15);
    const randomPart2 = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    const apiKey = `sk_${randomPart1}${randomPart2}${timestamp}`;
    const apiKeyHash = await bcrypt.hash(apiKey, 12); // Higher cost factor for API keys

    const newKeys = [
      ...existingKeys,
      {
        id: `key-${Date.now()}`,
        name: trimmedName,
        keyHash: apiKeyHash,
        permissions,
        createdAt: new Date(),
        lastUsed: null,
      },
    ];
    await this.usersService.updateUserDoc(req.user.userId, { apiKeys: newKeys });

    return {
      apiKey,
      name: trimmedName,
      message:
        'API key generated successfully. Please save this key securely - it will not be shown again.',
      warning: 'Store this key securely. You will not be able to view it again.',
    };
  }

  @Get('api-keys')
  async getApiKeys(@Request() req) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const apiKeys = (user.apiKeys || []).map((key: any) => ({
      id: key.id || key._id?.toString(),
      name: key.name,
      permissions: key.permissions,
      createdAt: key.createdAt,
      lastUsed: key.lastUsed,
    }));

    return { apiKeys };
  }

  @Delete('api-keys/:id')
  async revokeApiKey(@Request() req, @Param('id') id: string) {
    const user = await this.usersService.findById(req.user.userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    const key = user.apiKeys?.find((k: any) => (k.id || k._id?.toString()) === id);
    if (!key) {
      throw new NotFoundException('API key not found');
    }
    await this.usersService.removeApiKey(req.user.userId, id);
    return { message: 'API key revoked successfully' };
  }
}
