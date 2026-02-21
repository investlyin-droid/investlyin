import { IsNumber, Min } from 'class-validator';

export class CloseTradeDto {
  @IsNumber()
  @Min(0.00001, { message: 'Market price must be greater than 0' })
  marketPrice: number;
}
