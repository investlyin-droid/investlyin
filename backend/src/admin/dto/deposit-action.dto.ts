import { IsString, Matches } from 'class-validator';

export class DepositActionDto {
  @IsString()
  @Matches(/^[A-Z0-9]{6,20}$/, {
    message: 'Reference must be 6-20 alphanumeric characters',
  })
  reference: string;
}
