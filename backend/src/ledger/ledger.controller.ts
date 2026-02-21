import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LedgerService } from './ledger.service';

@Controller('ledger')
@UseGuards(AuthGuard('jwt'))
export class LedgerController {
  constructor(private ledgerService: LedgerService) {}

  @Get('my-transactions')
  async getMyTransactions(@Request() req) {
    return this.ledgerService.getUserLedger(req.user.userId);
  }
}
