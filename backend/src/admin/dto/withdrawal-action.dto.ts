import { IsString, IsOptional, MaxLength } from 'class-validator';

export class ApproveWithdrawalDto {
  @IsOptional()
  @IsString()
  @MaxLength(128, { message: 'Transaction hash is too long' })
  txHash?: string;
}

export class RejectWithdrawalDto {
  @IsOptional()
  @IsString()
  @MaxLength(500, { message: 'Rejection reason is too long' })
  reason?: string;
}
