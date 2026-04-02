import { Injectable, BadRequestException, Inject, Optional, forwardRef } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
import {
  DepositIntent,
  DepositIntentDocument,
  DepositMethod,
  DepositIntentStatus,
} from './schemas/deposit-intent.schema';
import { WalletService } from './wallet.service';
import { TradeGateway } from '../trade/trade.gateway';
import { PaymentConfig, PaymentConfigDocument } from '../admin/schemas/payment-config.schema';

const MIN_DEPOSIT = 100; // Standard Account minimum
const MAX_DEPOSIT = 500000;
const INTENT_EXPIRY_HOURS = 24;
const REFERENCE_LENGTH = 12;

@Injectable()
export class DepositService {
  constructor(
    @InjectModel(DepositIntent.name)
    private depositIntentModel: Model<DepositIntentDocument>,
    @InjectModel(PaymentConfig.name)
    private paymentConfigModel: Model<PaymentConfigDocument>,
    private walletService: WalletService,
    private configService: ConfigService,
    @Optional() @Inject(forwardRef(() => TradeGateway))
    private tradeGateway?: TradeGateway,
  ) {}

  private generateReference(): string {
    return randomBytes(REFERENCE_LENGTH)
      .toString('base64url')
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 14) || randomBytes(7).toString('hex').toUpperCase();
  }

  /** Supported crypto networks (env: DEPOSIT_CRYPTO_<NETWORK>, e.g. DEPOSIT_CRYPTO_POLYGON) */
  static readonly CRYPTO_NETWORKS = [
    { id: 'POLYGON', label: 'Polygon', explorerName: 'Polygonscan', explorerBase: 'https://polygonscan.com/address/' },
    { id: 'BASE', label: 'Base', explorerName: 'Basescan', explorerBase: 'https://basescan.org/address/' },
    { id: 'BNB', label: 'BNB Chain', explorerName: 'Bscscan', explorerBase: 'https://bscscan.com/address/' },
    { id: 'ARBITRUM', label: 'Arbitrum', explorerName: 'Arbiscan', explorerBase: 'https://arbiscan.io/address/' },
    { id: 'LINEA', label: 'Linea', explorerName: 'Lineascan', explorerBase: 'https://lineascan.build/address/' },
    { id: 'SOLANA', label: 'Solana', explorerName: 'Solscan', explorerBase: 'https://solscan.io/account/' },
    { id: 'BTC', label: 'Bitcoin', explorerName: 'Mempool', explorerBase: 'https://mempool.space/address/' },
    { id: 'TRON', label: 'Tron', explorerName: 'Tronscan', explorerBase: 'https://tronscan.org/#/address/' },
    { id: 'ETH', label: 'Ethereum', explorerName: 'Etherscan', explorerBase: 'https://etherscan.io/address/' },
    { id: 'USDT-ERC20', label: 'USDT (ERC-20)', explorerName: 'Etherscan', explorerBase: 'https://etherscan.io/address/' },
    { id: 'USDT-TRC20', label: 'USDT (TRC-20)', explorerName: 'Tronscan', explorerBase: 'https://tronscan.org/#/address/' },
  ] as const;

  private async getCryptoAddress(network: string): Promise<string> {
    // First, try to get from database configuration
    try {
      const config = await this.paymentConfigModel.findOne({ configKey: 'default' });
      if (config?.cryptoAddresses) {
        const networkKey = network.replace(/-/g, '_') as keyof typeof config.cryptoAddresses;
        const addr = config.cryptoAddresses[networkKey];
        if (addr) return addr;
      }
    } catch (error) {
      // Fallback to environment variables if DB lookup fails
    }

    // Fallback to environment variables
    const envKey = `DEPOSIT_CRYPTO_${network.replace(/-/g, '_')}`;
    const addr = this.configService.get<string>(envKey);
    if (addr) return addr;

    // Final fallback to defaults
    switch (network) {
      case 'POLYGON':
      case 'BASE':
      case 'BNB':
      case 'ARBITRUM':
      case 'LINEA':
      case 'ETH':
      case 'USDT-ERC20':
        return this.configService.get<string>('DEPOSIT_CRYPTO_ETH') || '0xf65095068d92161BE75AffE85402ad9E78AC4719';
      case 'USDT-TRC20':
      case 'TRON':
        return this.configService.get<string>('DEPOSIT_CRYPTO_TRON') || 'TJJwio3cDnPFf214nCfHc7wCskfmJpf1Pr';
      case 'BTC':
        return this.configService.get<string>('DEPOSIT_CRYPTO_BTC') || 'bc1qy4dl4rz9twxzhgvm4qOc7a56xdmnz6f6mt5le6';
      case 'SOLANA':
        return this.configService.get<string>('DEPOSIT_CRYPTO_SOLANA') || 'By9qdy3EtEaxTLdMXNU1B7v5PiamkXL4aBjvfUJW1tPD';
      default:
        return this.configService.get<string>('DEPOSIT_CRYPTO_ETH') || '0xf65095068d92161BE75AffE85402ad9E78AC4719';
    }
  }

  private getExplorerUrl(network: string, address: string): string {
    const net = DepositService.CRYPTO_NETWORKS.find((n) => n.id === network);
    if (!net) return '';
    return `${net.explorerBase}${address}`;
  }

  getExplorerUrlForNetwork(network: string, address: string): string {
    return this.getExplorerUrl(network, address);
  }

  async getCryptoAddressForNetwork(network: string): Promise<string> {
    return this.getCryptoAddress(network);
  }

  getCryptoNetworksList() {
    return DepositService.CRYPTO_NETWORKS.map((n) => ({ id: n.id, label: n.label, explorerName: n.explorerName }));
  }

  private getBankDetails(): { name: string; iban: string; swift: string; referenceLabel: string } {
    return {
      name: this.configService.get<string>('DEPOSIT_BANK_NAME') || 'Investlyin Ltd',
      iban: this.configService.get<string>('DEPOSIT_BANK_IBAN') || 'GB00SIMU00000000000000',
      swift: this.configService.get<string>('DEPOSIT_BANK_SWIFT') || 'SIMUGB2L',
      referenceLabel: this.configService.get<string>('DEPOSIT_BANK_REF_LABEL') || 'Payment reference',
    };
  }

  async createIntent(
    userId: string,
    method: DepositMethod,
    amount: number,
    currency: string,
    methodOption?: string,
  ): Promise<DepositIntentDocument> {
    if (amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
      throw new BadRequestException(
        `Amount must be between $${MIN_DEPOSIT} and $${MAX_DEPOSIT}`,
      );
    }
    if (!Object.values(DepositMethod).includes(method)) {
      throw new BadRequestException('Invalid deposit method');
    }

    const reference = this.generateReference();
    const expiresAt = new Date(Date.now() + INTENT_EXPIRY_HOURS * 60 * 60 * 1000);

    const intent = new this.depositIntentModel({
      userId,
      method,
      amount,
      currency,
      status: DepositIntentStatus.PENDING,
      reference,
      methodOption: methodOption || undefined,
      expiresAt,
    });

    const saved = await intent.save();

    if (method === DepositMethod.CRYPTO && methodOption) {
      const addr = await this.getCryptoAddress(methodOption);
      (saved as any).cryptoAddress = addr;
      (saved as any).network = methodOption;
      (saved as any).explorerUrl = this.getExplorerUrl(methodOption, addr);
      (saved as any).networkLabel = DepositService.CRYPTO_NETWORKS.find((n) => n.id === methodOption)?.label || methodOption;
      (saved as any).explorerName = DepositService.CRYPTO_NETWORKS.find((n) => n.id === methodOption)?.explorerName || 'Explorer';
      
      // Ensure address is always available (from database config or fallback)
      if (!addr) {
        throw new BadRequestException(`Crypto address not configured for network: ${methodOption}`);
      }
    }
    if (method === DepositMethod.BANK) {
      const bank = this.getBankDetails();
      (saved as any).bankDetails = { ...bank, reference: saved.reference };
    }
    if (method === DepositMethod.CARD) {
      // Try to get SumUp configuration from database first
      let cardPaymentUrl: string | null = null;
      try {
        const config = await this.paymentConfigModel.findOne({ configKey: 'default' });
        if (config?.sumupCheckoutUrl) {
          cardPaymentUrl = config.sumupCheckoutUrl;
        } else if (config?.sumupApiKey) {
          // If only API key is provided, construct checkout URL
          // SumUp checkout URL format: https://checkout.sumup.com/...
          cardPaymentUrl = `https://checkout.sumup.com/pay?key=${config.sumupApiKey}`;
        }
      } catch (error) {
        // Fallback to environment variables
      }
      
      if (!cardPaymentUrl) {
        cardPaymentUrl =
          this.configService.get<string>('DEPOSIT_CARD_SUMUP_URL') ||
          this.configService.get<string>('DEPOSIT_CARD_PAYMENT_URL') ||
          null;
      }
      
      (saved as any).cardPaymentUrl = cardPaymentUrl;
      (saved as any).clientSecret = `pi_sim_${saved._id}_${Date.now()}`;
    }

    return saved;
  }

  async updateIntentScreenshot(
    userId: string,
    intentId: string,
    paymentScreenshotUrl: string,
  ): Promise<DepositIntentDocument | null> {
    const intent = await this.depositIntentModel.findOne({
      _id: intentId,
      userId,
      status: DepositIntentStatus.PENDING,
    });
    if (!intent) return null;
    intent.paymentScreenshotUrl = paymentScreenshotUrl;
    await intent.save();
    return this.getIntent(userId, intentId);
  }

  /**
   * User marks intent as "submitted for review" (has sent payment and uploaded screenshot).
   * Only PENDING intents with paymentScreenshotUrl can be submitted.
   */
  async submitIntentForReview(userId: string, intentId: string): Promise<DepositIntentDocument | null> {
    const intent = await this.depositIntentModel.findOne({
      _id: intentId,
      userId,
      status: DepositIntentStatus.PENDING,
    });
    if (!intent) return null;
    if (!intent.paymentScreenshotUrl) {
      throw new BadRequestException('Please upload a payment screenshot before submitting for review.');
    }
    if (new Date() > intent.expiresAt) {
      intent.status = DepositIntentStatus.EXPIRED;
      await intent.save();
      throw new BadRequestException('Deposit intent has expired.');
    }
    intent.status = DepositIntentStatus.SUBMITTED;
    await intent.save();
    return this.getIntent(userId, intentId) as Promise<DepositIntentDocument | null>;
  }

  async getIntent(userId: string, intentId: string): Promise<DepositIntentDocument | null> {
    const intent = await this.depositIntentModel.findOne({
      _id: intentId,
      userId,
    });
    if (!intent) return null;
    const obj = intent.toObject() as any;
    if (intent.method === DepositMethod.CRYPTO && intent.methodOption) {
      const addr = await this.getCryptoAddress(intent.methodOption);
      obj.cryptoAddress = addr;
      obj.network = intent.methodOption;
      obj.explorerUrl = this.getExplorerUrl(intent.methodOption, addr);
      obj.networkLabel = DepositService.CRYPTO_NETWORKS.find((n) => n.id === intent.methodOption)?.label || intent.methodOption;
      obj.explorerName = DepositService.CRYPTO_NETWORKS.find((n) => n.id === intent.methodOption)?.explorerName || 'Explorer';
    }
    if (intent.method === DepositMethod.BANK) {
      const bank = this.getBankDetails();
      obj.bankDetails = { ...bank, reference: intent.reference };
    }
    return obj as any;
  }

  async listIntents(userId: string, status?: DepositIntentStatus) {
    const filter: any = { userId };
    if (status) filter.status = status;
    return this.depositIntentModel.find(filter).sort({ createdAt: -1 }).limit(50).exec();
  }

  async listAllIntents(status?: DepositIntentStatus, limit = 100) {
    const filter: any = {};
    if (status) filter.status = status;
    return this.depositIntentModel.find(filter).sort({ createdAt: -1 }).limit(limit).lean().exec();
  }

  async confirmDeposit(
    userId: string,
    intentId: string,
    adminId?: string,
  ): Promise<{ wallet: any }> {
    const intent = await this.depositIntentModel.findOne({
      _id: intentId,
      userId,
    });
    if (!intent) {
      throw new BadRequestException('Deposit intent not found');
    }
    const allowedStatuses = [DepositIntentStatus.PENDING, DepositIntentStatus.SUBMITTED];
    if (!allowedStatuses.includes(intent.status)) {
      throw new BadRequestException('Intent already processed or expired');
    }
    if (new Date() > intent.expiresAt) {
      intent.status = DepositIntentStatus.EXPIRED;
      await intent.save();
      throw new BadRequestException('Deposit intent has expired');
    }

    const depositFeePercent = this.configService.get<number>('PLATFORM_DEPOSIT_FEE_PERCENT') ?? 0;
    const feeAmount = (intent.amount * depositFeePercent) / 100;
    const netAmount = intent.amount - feeAmount;

    const description = `Deposit via ${intent.method} (ref: ${intent.reference})${feeAmount > 0 ? `, fee $${feeAmount.toFixed(2)}` : ''}`;
    const wallet = await this.walletService.deposit(userId, netAmount, description, {
      method: intent.method,
      reference: intent.reference,
      grossAmount: intent.amount,
      fee: feeAmount,
    }, intent._id.toString());

    intent.status = DepositIntentStatus.COMPLETED;
    intent.completedAt = new Date();
    await intent.save();

    if (this.tradeGateway) {
      this.tradeGateway.emitBalanceUpdated(userId, {
        balance: wallet.balance,
        currency: wallet.currency,
      });
    }

    return { wallet };
  }

  async confirmDepositByReference(reference: string, adminId?: string): Promise<{ wallet?: any }> {
    const intent = await this.depositIntentModel.findOne({
      reference: reference.toUpperCase().replace(/\s/g, ''),
      status: { $in: [DepositIntentStatus.PENDING, DepositIntentStatus.SUBMITTED] },
    });
    if (!intent) {
      throw new BadRequestException('Deposit not found or already processed');
    }
    if (new Date() > intent.expiresAt) {
      intent.status = DepositIntentStatus.EXPIRED;
      await intent.save();
      throw new BadRequestException('Deposit intent has expired');
    }
    return this.confirmDeposit(intent.userId, intent._id.toString(), adminId);
  }

  /** Admin only: reject/cancel a pending or submitted deposit intent (no balance credit) */
  async rejectDepositByReference(reference: string): Promise<{ intent: any }> {
    const intent = await this.depositIntentModel.findOne({
      reference: reference.toUpperCase().replace(/\s/g, ''),
      status: { $in: [DepositIntentStatus.PENDING, DepositIntentStatus.SUBMITTED] },
    });
    if (!intent) {
      throw new BadRequestException('Deposit not found or already processed');
    }
    intent.status = DepositIntentStatus.CANCELLED;
    await intent.save();
    return { intent: intent.toObject() };
  }
}
