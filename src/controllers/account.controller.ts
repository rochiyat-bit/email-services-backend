import { Controller, Post, Get, Put, Delete, Body, Param } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailAccount, AccountStatus } from '../entities/email-account.entity';
import { CreateAccountDto, UpdateAccountDto } from '../dto';
import { EncryptionUtil } from '../utils/encryption.util';
import { EmailProviderFactory } from '../providers/provider.factory';

@Controller('accounts')
export class AccountController {
  constructor(
    @InjectRepository(EmailAccount)
    private readonly accountRepo: Repository<EmailAccount>,
    private readonly encryptionUtil: EncryptionUtil,
    private readonly providerFactory: EmailProviderFactory,
  ) {}

  @Post()
  async createAccount(@Body() dto: CreateAccountDto) {
    // Validate credentials format
    if (!this.providerFactory.validateCredentials(dto.provider, dto.credentials)) {
      return { error: 'Invalid credentials format for provider' };
    }

    // Encrypt credentials
    const encryptedCredentials = this.encryptionUtil.encrypt(dto.credentials);

    const account = this.accountRepo.create({
      ...dto,
      credentials: encryptedCredentials as any,
      status: AccountStatus.ACTIVE,
    });

    const saved = await this.accountRepo.save(account);

    // Don't return encrypted credentials
    const { credentials, ...result } = saved;
    return result;
  }

  @Get(':id')
  async getAccount(@Param('id') id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });

    if (!account) {
      return { error: 'Account not found' };
    }

    const { credentials, ...result } = account;
    return result;
  }

  @Get('user/:userId')
  async getAccountsByUser(@Param('userId') userId: string) {
    const accounts = await this.accountRepo.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    return accounts.map(({ credentials, ...account }) => account);
  }

  @Put(':id')
  async updateAccount(@Param('id') id: string, @Body() dto: UpdateAccountDto) {
    const account = await this.accountRepo.findOne({ where: { id } });

    if (!account) {
      return { error: 'Account not found' };
    }

    // Encrypt credentials if provided
    if (dto.credentials) {
      dto.credentials = this.encryptionUtil.encrypt(dto.credentials) as any;
    }

    Object.assign(account, dto);
    const updated = await this.accountRepo.save(account);

    const { credentials, ...result } = updated;
    return result;
  }

  @Delete(':id')
  async deleteAccount(@Param('id') id: string) {
    await this.accountRepo.delete(id);
    return { message: 'Account deleted successfully' };
  }

  @Post(':id/verify')
  async verifyAccount(@Param('id') id: string) {
    const account = await this.accountRepo.findOne({ where: { id } });

    if (!account) {
      return { error: 'Account not found' };
    }

    try {
      // Decrypt credentials
      const credentials = this.encryptionUtil.decrypt(account.credentials as any);

      // Create provider and verify
      const provider = this.providerFactory.createProvider(account.provider, credentials);
      const isValid = await provider.verifyCredentials();

      // Update account status
      await this.accountRepo.update(id, {
        status: isValid ? AccountStatus.ACTIVE : AccountStatus.FAILED,
        lastSyncAt: new Date(),
      });

      return { valid: isValid, status: isValid ? 'active' : 'failed' };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }
}
