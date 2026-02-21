import { IsEnum, IsNumber, Min, Max, IsOptional, IsString } from 'class-validator';
import { DepositMethod } from '../schemas/deposit-intent.schema';

export class CreateDepositIntentDto {
  @IsEnum(DepositMethod, { message: 'Method must be CRYPTO, BANK, or CARD' })
  method: DepositMethod;

  @IsNumber()
  @Min(100, { message: 'Minimum deposit is $100' })
  @Max(500000, { message: 'Maximum deposit is $500,000' })
  amount: number;

  @IsOptional()
  @IsString()
  currency?: string;

  @IsOptional()
  @IsString()
  methodOption?: string;
}
