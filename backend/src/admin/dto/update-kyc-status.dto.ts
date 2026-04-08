import { IsString, IsEnum, IsOptional } from 'class-validator';

export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  pending = 'PENDING',
  approved = 'APPROVED',
  rejected = 'REJECTED',
}


export class UpdateKycStatusDto {
  @IsString()
  @IsNotEmpty()
  kycStatus: string;

  @IsString()
  @IsOptional()
  reason?: string;
}



