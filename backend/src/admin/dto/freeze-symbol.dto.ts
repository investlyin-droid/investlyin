import { IsBoolean } from 'class-validator';

export class FreezeSymbolDto {
  @IsBoolean()
  isFrozen: boolean;
}
