import { IsOptional, IsString, IsObject, MaxLength, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class BankDetailsDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  iban?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  swift?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  referenceLabel?: string;
}

export class UpdatePaymentConfigDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  sumupApiKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  sumupCheckoutUrl?: string;

  /** Map of network key to wallet address */
  @IsOptional()
  @IsObject()
  cryptoAddresses?: Record<string, string>;

  @IsOptional()
  @ValidateNested()
  @Type(() => BankDetailsDto)
  bankDetails?: BankDetailsDto;
}
