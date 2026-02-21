import { IsNumber, Min, IsOptional, IsString, MaxLength } from 'class-validator';

export class WithdrawDto {
  @IsNumber()
  @Min(0.01, { message: 'Withdrawal amount must be greater than 0' })
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
