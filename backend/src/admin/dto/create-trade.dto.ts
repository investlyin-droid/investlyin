import { IsString, IsNumber, IsEnum, IsOptional, Min, Max } from 'class-validator';

export class CreateTradeForUserDto {
  @IsString()
  userId: string;

  @IsString()
  symbol: string;

  @IsEnum(['BUY', 'SELL'])
  direction: 'BUY' | 'SELL';

  @IsNumber()
  @Min(0.01)
  @Max(1000)
  lotSize: number;

  @IsNumber()
  @Min(0)
  marketPrice: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sl?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tp?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  customOpenPrice?: number;
}
