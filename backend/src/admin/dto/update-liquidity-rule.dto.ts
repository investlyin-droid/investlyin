import { IsNumber, IsBoolean, IsOptional } from 'class-validator';

export class UpdateLiquidityRuleDto {
  @IsOptional()
  @IsNumber()
  bidSpread?: number;

  @IsOptional()
  @IsNumber()
  askSpread?: number;

  @IsOptional()
  @IsNumber()
  priceOffset?: number;

  @IsOptional()
  @IsNumber()
  slippageMin?: number;

  @IsOptional()
  @IsNumber()
  slippageMax?: number;

  @IsOptional()
  @IsNumber()
  executionDelayMs?: number;

  @IsOptional()
  @IsBoolean()
  isFrozen?: boolean;

  @IsOptional()
  @IsNumber()
  longSwapPerDay?: number;

  @IsOptional()
  @IsNumber()
  shortSwapPerDay?: number;

  @IsOptional()
  @IsNumber()
  leverage?: number;
}
