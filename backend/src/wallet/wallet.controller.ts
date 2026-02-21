import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  NotFoundException,
  BadRequestException,
  UseInterceptors,
  UploadedFile,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { WalletService } from './wallet.service';
import { DepositService } from './deposit.service';
import { DepositIntentStatus } from './schemas/deposit-intent.schema';
import { CreateDepositIntentDto } from './dto/create-deposit-intent.dto';
import { CreateWithdrawalRequestDto } from './dto/create-withdrawal-request.dto';
import { UpdateDepositIntentDto } from './dto/update-deposit-intent.dto';
import { WithdrawalService } from './withdrawal.service';
import { WithdrawalRequestStatus } from './schemas/withdrawal-request.schema';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Controller('wallet')
@UseGuards(AuthGuard('jwt'))
export class WalletController {
  constructor(
    private walletService: WalletService,
    private depositService: DepositService,
    private withdrawalService: WithdrawalService,
  ) {}

  @Get()
  async getWallet(@Request() req) {
    return this.walletService.getWallet(req.user.userId);
  }

  @Get('fees')
  getFeeConfig() {
    return this.walletService.getFeeConfig();
  }

  @Get('deposit/crypto-networks')
  getCryptoNetworks() {
    return this.depositService.getCryptoNetworksList();
  }

  @Get('deposit/crypto-address/:network')
  async getCryptoAddress(@Param('network') network: string) {
    const address = await this.depositService.getCryptoAddressForNetwork(network);
    const networkInfo = this.depositService.getCryptoNetworksList().find(n => n.id === network);
    return {
      address,
      network: networkInfo?.label || network,
      explorerName: networkInfo?.explorerName,
      explorerUrl: address ? this.depositService.getExplorerUrlForNetwork(network, address) : null,
    };
  }

  @Post('deposit/intent')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createDepositIntent(@Request() req, @Body() body: CreateDepositIntentDto) {
    return this.depositService.createIntent(
      req.user.userId,
      body.method,
      body.amount,
      body.currency || 'USD',
      body.methodOption,
    );
  }

  @Get('deposit/intents')
  async listDepositIntents(
    @Request() req,
    @Query('status') status?: DepositIntentStatus,
  ) {
    return this.depositService.listIntents(req.user.userId, status);
  }

  @Get('deposit/intents/:id')
  async getDepositIntent(@Request() req, @Param('id') id: string) {
    const intent = await this.depositService.getIntent(req.user.userId, id);
    if (!intent) throw new NotFoundException('Deposit intent not found');
    return intent;
  }

  @Patch('deposit/intents/:id')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateDepositIntent(
    @Request() req,
    @Param('id') id: string,
    @Body() body: UpdateDepositIntentDto,
  ) {
    if (body?.status === 'SUBMITTED') {
      const updated = await this.depositService.submitIntentForReview(req.user.userId, id);
      if (!updated) throw new NotFoundException('Deposit intent not found or not pending');
      return updated;
    }
    if (body?.paymentScreenshotUrl) {
      const updated = await this.depositService.updateIntentScreenshot(
        req.user.userId,
        id,
        body.paymentScreenshotUrl,
      );
      if (!updated) throw new NotFoundException('Deposit intent not found or not pending');
      return updated;
    }
    throw new BadRequestException('Provide paymentScreenshotUrl to attach a screenshot, or status: "SUBMITTED" to submit for review.');
  }

  @Post('deposit/upload-screenshot')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async uploadPaymentScreenshot(@Request() req, @UploadedFile() file: { buffer?: Buffer; originalname?: string }) {
    if (!file?.buffer) throw new BadRequestException('File required');
    const uploadBase = process.env.UPLOAD_DIR || 'uploads';
    const dir = path.join(process.cwd(), uploadBase, 'payment-screenshots');
    try {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (e: any) {
      throw new BadRequestException(
        `Upload directory unavailable: ${e?.message || 'cannot create payment-screenshots folder'}. Check UPLOAD_DIR in .env.`,
      );
    }
    const ext = (file.originalname && path.extname(file.originalname)) || '.png';
    const safeExt = ['.png', '.jpg', '.jpeg', '.webp', '.pdf'].includes(ext.toLowerCase()) ? ext : '.png';
    const filename = `${req.user.userId}_${Date.now()}_${randomUUID().slice(0, 8)}${safeExt}`;
    const filepath = path.join(dir, filename);
    try {
      fs.writeFileSync(filepath, file.buffer);
    } catch (e: any) {
      throw new BadRequestException(
        `Failed to save payment screenshot: ${e?.message || 'disk error'}. Check UPLOAD_DIR and permissions.`,
      );
    }
    const url = `/uploads/payment-screenshots/${filename}`;
    return { url };
  }

  @Post('deposit/confirm')
  async confirmDeposit() {
    throw new BadRequestException(
      'Deposits require admin verification. Upload a screenshot of your payment and wait for confirmation.',
    );
  }

  @Post('withdraw')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createWithdrawalRequest(@Request() req, @Body() body: CreateWithdrawalRequestDto) {
    return this.withdrawalService.createRequest(req.user.userId, body);
  }

  @Get('withdrawal-requests')
  async listWithdrawalRequests(
    @Request() req,
    @Query('status') status?: WithdrawalRequestStatus,
    @Query('limit') limit?: string,
  ) {
    return this.withdrawalService.listByUser(
      req.user.userId,
      status,
      limit ? parseInt(limit, 10) : 50,
    );
  }

  @Get('withdrawal-requests/:id')
  async getWithdrawalRequest(@Request() req, @Param('id') id: string) {
    return this.withdrawalService.getById(id, req.user.userId);
  }
}
