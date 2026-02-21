import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class FirebaseRegisterDto {
  @IsString()
  @MinLength(10, { message: 'firebaseToken is required' })
  firebaseToken: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  lastName?: string;
}
