import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TradeService } from './trade.service';
import { OpenTradeDto } from './dto/open-trade.dto';
import { CloseTradeDto } from './dto/close-trade.dto';

@Controller('trades')
@UseGuards(AuthGuard('jwt'))
export class TradeController {
  constructor(private tradeService: TradeService) {}

  @Post('open')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async openTrade(@Request() req, @Body() body: OpenTradeDto) {
    return this.tradeService.openTrade(
      req.user.userId,
      body.symbol,
      body.direction,
      body.lotSize,
      body.marketPrice,
      body.sl,
      body.tp,
    );
  }

  @Post(':id/close')
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async closeTrade(
    @Param('id') id: string,
    @Body() body: CloseTradeDto,
    @Request() req: any,
  ) {
    return this.tradeService.closeTrade(id, body.marketPrice, req.user.userId);
  }

  @Get('my-trades')
  async getMyTrades(@Request() req) {
    return this.tradeService.getUserTrades(req.user.userId);
  }

  @Get('my-trades/open')
  async getMyOpenTrades(@Request() req) {
    return this.tradeService.getUserTrades(req.user.userId, 'OPEN' as any);
  }
}
