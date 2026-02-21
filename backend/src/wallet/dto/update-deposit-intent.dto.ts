import { IsOptional, IsString, IsIn } from 'class-validator';

export class UpdateDepositIntentDto {
  @IsOptional()
  @IsString()
  paymentScreenshotUrl?: string;

  @IsOptional()
  @IsIn(['SUBMITTED'], { message: 'status must be "SUBMITTED" to submit for review' })
  status?: 'SUBMITTED';
}
