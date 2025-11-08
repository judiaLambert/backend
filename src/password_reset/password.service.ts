import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordResetToken } from './password.entity';
import * as crypto from 'crypto';

@Injectable()
export class PasswordResetService {
  constructor(
    @InjectRepository(PasswordResetToken)
    private tokenRepo: Repository<PasswordResetToken>,
  ) {}

  async generateToken(email: string): Promise<string> {
    // Supprimer les tokens existants pour cet email
    await this.tokenRepo.delete({ email });

    // Générer un nouveau token
    const token = crypto.randomBytes(32).toString('hex');
    const expiration = new Date();
    expiration.setHours(expiration.getHours() + 1); // Expire dans 1h

    const resetToken = this.tokenRepo.create({
      email,
      token,
      expiration
    });

    await this.tokenRepo.save(resetToken);
    return token;
  }

  async validateToken(token: string): Promise<{ valid: boolean; email?: string }> {
    const resetToken = await this.tokenRepo.findOne({
      where: { token, utilise: false }
    });

    if (!resetToken) {
      return { valid: false };
    }

    if (new Date() > resetToken.expiration) {
      return { valid: false };
    }

    return { valid: true, email: resetToken.email };
  }

  async markTokenAsUsed(token: string): Promise<void> {
    await this.tokenRepo.update({ token }, { utilise: true });
  }
}