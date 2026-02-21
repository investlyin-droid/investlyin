import { IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class ForceCloseTradeDto {
  @Type(() => Number)
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0.00001, { message: 'closePrice must be a positive number' })
  closePrice: number;
}
