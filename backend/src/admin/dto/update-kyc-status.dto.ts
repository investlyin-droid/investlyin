import { IsString, IsEnum } from 'class-validator';

export enum KycStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export class UpdateKycStatusDto {
  @IsEnum(KycStatus)
  kycStatus: KycStatus;
}
