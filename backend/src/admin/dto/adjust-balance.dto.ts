import { IsNumber, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class AdjustBalanceDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  amount: number;

  @IsString()
  @MaxLength(500)
  description: string;
}
