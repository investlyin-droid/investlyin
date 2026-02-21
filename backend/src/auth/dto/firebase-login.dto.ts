import { IsString, IsEmail, IsOptional, MinLength } from 'class-validator';

export class FirebaseLoginDto {
  @IsString()
  @MinLength(10, { message: 'firebaseToken is required' })
  firebaseToken: string;

  /** Email from client; for OAuth (e.g. Apple) may be empty - backend falls back to token email */
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  displayName?: string;
}
