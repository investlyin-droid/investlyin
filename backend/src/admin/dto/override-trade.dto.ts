import { IsNumber, IsString, IsOptional, IsBoolean, IsObject, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class OverrideTradeDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  openPrice?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  closePrice?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => value === true || value === 'true')
  isActive?: boolean;

  @IsOptional()
  @IsNumber()
  pnl?: number;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  lotSize?: number;

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
  swap?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  commission?: number;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  createdAt?: Date;

  @IsOptional()
  @Transform(({ value }) => (value ? new Date(value) : undefined))
  closedAt?: Date;

  /** Admin notes: string (stored as-is) or object e.g. { note, updatedAt } */
  @IsOptional()
  adminNotes?: string | Record<string, any>;
}
