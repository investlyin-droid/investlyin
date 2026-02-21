import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpException,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminService } from './admin.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminAllowlistGuard } from '../auth/guards/admin-allowlist.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { TradeDirection } from '../trade/schemas/trade.schema';
import { CreateTradeForUserDto } from './dto/create-trade.dto';
import { AdjustBalanceDto } from './dto/adjust-balance.dto';
import { ForceCloseTradeDto } from './dto/force-close-trade.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateKycStatusDto } from './dto/update-kyc-status.dto';
import { UpdateUserProfileDto } from './dto/update-user-profile.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { DepositActionDto } from './dto/deposit-action.dto';
import { FreezeSymbolDto } from './dto/freeze-symbol.dto';
import { OverrideTradeDto } from './dto/override-trade.dto';
import { MongoIdDto } from './dto/mongo-id.dto';
import { UpdateLiquidityRuleDto } from './dto/update-liquidity-rule.dto';
import { ApproveWithdrawalDto, RejectWithdrawalDto } from './dto/withdrawal-action.dto';
import { UpdatePaymentConfigDto } from './dto/update-payment-config.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), RolesGuard, AdminAllowlistGuard)
@Roles('admin', 'super_admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('overview')
  async getOverview() {
    try {
      return await this.adminService.getOverview();
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to load overview',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('deposit-intents')
  async getDepositIntents(
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminService.listDepositIntents(
      status as any,
      limit ? parseInt(limit, 10) : 100,
    );
  }

  @Get('withdrawal-requests')
  async getWithdrawalRequests(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.adminService.listWithdrawalRequests(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      status as any,
      sortBy || 'createdAt',
      sortOrder || 'desc',
    );
  }

  @Post('withdrawal-requests/:id/approve')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async approveWithdrawalRequest(
    @Param('id') id: string,
    @Body() body: ApproveWithdrawalDto,
    @Request() req: any,
  ) {
    return this.adminService.approveWithdrawalRequest(
      id,
      req.user.userId,
      req.user.email,
      body?.txHash,
    );
  }

  @Post('withdrawal-requests/:id/reject')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectWithdrawalRequest(
    @Param('id') id: string,
    @Body() body: RejectWithdrawalDto,
    @Request() req: any,
  ) {
    return this.adminService.rejectWithdrawalRequest(
      id,
      req.user.userId,
      req.user.email,
      body?.reason,
    );
  }

  @Get('audit-log')
  async getAuditLog(
    @Query('limit') limit?: string,
    @Query('action') action?: string,
  ) {
    return this.adminService.getAuditLog(
      limit ? parseInt(limit, 10) : undefined,
      action,
    );
  }

  @Get('liquidity-rules')
  async getAllLiquidityRules() {
    return this.adminService.getAllLiquidityRules();
  }

  @Get('liquidity-rules/:symbol')
  async getLiquidityRule(@Param('symbol') symbol: string) {
    return this.adminService.getLiquidityRule(symbol);
  }

  @Post('liquidity-rules/:symbol')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateLiquidityRule(
    @Param('symbol') symbol: string,
    @Body() rules: UpdateLiquidityRuleDto,
    @Request() req: any,
  ) {
    return this.adminService.createOrUpdateLiquidityRule(
      symbol,
      rules as any,
      req.user.userId,
      req.user.email,
    );
  }

  @Get('trades')
  async getAllTrades(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    try {
      return await this.adminService.getAllTrades(
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50,
        sortBy || 'createdAt',
        sortOrder || 'desc',
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to load trades',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('trades/:id/force-close')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async forceCloseTrade(
    @Param('id') id: string,
    @Body() body: ForceCloseTradeDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.forceCloseTrade(
        id,
        body.closePrice,
        req.user?.userId,
        req.user?.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to force close trade',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('users/:userId/adjust-balance')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  async adjustBalance(
    @Param('userId') userId: string,
    @Body() body: AdjustBalanceDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.adjustUserBalance(
        userId,
        body.amount,
        body.description,
        req.user?.userId,
        req.user?.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to adjust balance',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('users/:userId/status')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setUserStatus(
    @Param('userId') userId: string,
    @Body() body: UpdateUserStatusDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.setUserStatus(
        userId,
        body.isActive,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update user status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('users/:userId/kyc-status')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async setUserKycStatus(
    @Param('userId') userId: string,
    @Body() body: UpdateKycStatusDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.setUserKycStatus(
        userId,
        body.kycStatus,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update KYC status',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('users')
  async getAllUsers(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ): Promise<any> {
    try {
      return await this.adminService.getAllUsers(
        page ? parseInt(page, 10) : 1,
        limit ? parseInt(limit, 10) : 50,
        sortBy || 'createdAt',
        sortOrder || 'desc',
      );
    } catch (error: any) {
      const errorMessage = error?.message || error?.toString() || 'Failed to load users';
      throw new HttpException(
        errorMessage,
        error?.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('users/:userId/transactions')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserTransactions(@Param('userId') userId: string) {
    try {
      return await this.adminService.getUserTransactions(userId);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to load transactions',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('deposit/reject')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async rejectDepositByReference(
    @Body() body: DepositActionDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.rejectDepositByReference(
        body.reference,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to reject deposit',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('symbols/:symbol/freeze')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async freezeSymbol(
    @Param('symbol') symbol: string,
    @Body() body: FreezeSymbolDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.freezeSymbol(
        symbol,
        body.isFrozen,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to freeze symbol',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('trades/:id/override')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async overrideTrade(
    @Param('id') id: string,
    @Body() body: OverrideTradeDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.overrideTrade(id, body, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to override trade',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('trades/:id/activate')
  async activateTrade(@Param('id') id: string, @Request() req: any) {
    return this.adminService.activateTrade(id, req.user.userId, req.user.email);
  }

  @Post('trades/:id/deactivate')
  async deactivateTrade(@Param('id') id: string, @Request() req: any) {
    return this.adminService.deactivateTrade(id, req.user.userId, req.user.email);
  }

  @Post('deposit/confirm')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async confirmDepositByReference(
    @Body() body: DepositActionDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.confirmDepositByReference(
        body.reference,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to confirm deposit',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('payment-config')
  async getPaymentConfig() {
    return this.adminService.getPaymentConfig();
  }

  @Put('payment-config')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updatePaymentConfig(
    @Body() body: UpdatePaymentConfigDto,
    @Request() req: any,
  ) {
    return this.adminService.updatePaymentConfig(
      body as any,
      req.user.userId,
      req.user.email,
    );
  }

  @Post('trades/create-for-user')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async createTradeForUser(
    @Body() body: CreateTradeForUserDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.createTradeForUser(
        body.userId,
        body.symbol,
        body.direction as TradeDirection,
        body.lotSize,
        body.marketPrice,
        req.user.userId,
        body.sl,
        body.tp,
        req.user.email,
        body.customOpenPrice,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to create trade',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('users/:userId')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteUser(@Param('userId') userId: string, @Request() req: any) {
    try {
      return await this.adminService.deleteUser(userId, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete user',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('trades/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteTrade(@Param('id') id: string, @Request() req: any) {
    try {
      return await this.adminService.deleteTrade(id, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete trade',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Put('users/:userId/profile')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async updateUserProfile(
    @Param('userId') userId: string,
    @Body() body: UpdateUserProfileDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.updateUserProfile(userId, body, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to update user profile',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('users/:userId/reset-password')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async resetUserPassword(
    @Param('userId') userId: string,
    @Body() body: ResetPasswordDto,
    @Request() req: any,
  ) {
    try {
      return await this.adminService.resetUserPassword(
        userId,
        body.newPassword,
        req.user.userId,
        req.user.email,
      );
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to reset password',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get('orders')
  async getAllOrders(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
    @Query('status') status?: string,
    @Query('symbol') symbol?: string,
    @Query('orderType') orderType?: string,
  ) {
    return this.adminService.getAllOrders(
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
      sortBy || 'createdAt',
      sortOrder || 'desc',
      status,
      symbol,
      orderType,
    );
  }

  @Get('users/:userId/orders')
  @UsePipes(new ValidationPipe({ transform: true }))
  async getUserOrders(@Param('userId') userId: string) {
    try {
      return await this.adminService.getUserOrders(userId);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to load orders',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Delete('orders/:id')
  @UsePipes(new ValidationPipe({ transform: true }))
  async deleteOrder(@Param('id') id: string, @Request() req: any) {
    try {
      return await this.adminService.deleteOrder(id, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to delete order',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('users/:userId/disable-2fa')
  @UsePipes(new ValidationPipe({ transform: true }))
  async disableUser2FA(@Param('userId') userId: string, @Request() req: any) {
    try {
      return await this.adminService.disableUser2FA(userId, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to disable 2FA',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post('users/:userId/reset-2fa')
  @UsePipes(new ValidationPipe({ transform: true }))
  async resetUser2FA(@Param('userId') userId: string, @Request() req: any) {
    try {
      return await this.adminService.resetUser2FA(userId, req.user.userId, req.user.email);
    } catch (error: any) {
      throw new HttpException(
        error.message || 'Failed to reset 2FA',
        error.status || HttpStatus.BAD_REQUEST,
      );
    }
  }
}
