import { IsNumber, Min, IsString, IsIn, MinLength, MaxLength, Matches } from 'class-validator';

/** Supported chain ids for withdrawal (must match frontend and DepositService.CRYPTO_NETWORKS) */
export const WITHDRAWAL_CHAINS = [
  'POLYGON', 'BASE', 'BNB', 'ARBITRUM', 'LINEA', 'SOLANA', 'BTC', 'TRON', 'ETH',
  'USDT-ERC20', 'USDT-TRC20',
] as const;

export class CreateWithdrawalRequestDto {
  @IsNumber()
  @Min(1, { message: 'Amount must be at least 1 USD' })
  amount: number;

  @IsString()
  @MinLength(8, { message: 'Wallet address is too short' })
  @MaxLength(256, { message: 'Wallet address is too long' })
  @Matches(/^[a-zA-Z0-9._\-:\s]+$/, {
    message: 'Wallet address contains invalid characters (use only letters, numbers, 0x, dots, hyphens)',
  })
  walletAddress: string;

  @IsString()
  @IsIn(WITHDRAWAL_CHAINS as unknown as string[], {
    message: `chain must be one of: ${WITHDRAWAL_CHAINS.join(', ')}`,
  })
  chain: string;
}
