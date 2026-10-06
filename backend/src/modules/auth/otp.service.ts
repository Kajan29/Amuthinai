import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { User, UserDocument } from 'src/modules/users/schemas/user.schema';

@Injectable()
export class OtpService {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
    private readonly config: ConfigService,
  ) {}

  /**
   * Generate a 6-digit OTP
   */
  private generateOtp(): string {
    const otpLength = parseInt(this.config.get('OTP_LENGTH', '6'), 10);
    const min = Math.pow(10, otpLength - 1);
    const max = Math.pow(10, otpLength) - 1;
    return Math.floor(min + Math.random() * (max - min + 1)).toString();
  }

  /**
   * Get OTP expiry time
   */
  private getOtpExpiry(): Date {
    const expiryMinutes = parseInt(
      this.config.get('OTP_EXPIRES_IN', '10m').replace('m', ''),
      10,
    );
    return new Date(Date.now() + expiryMinutes * 60 * 1000);
  }

  /**
   * Store OTP for a user
   */
  async createOtp(
    email: string,
    purpose: 'email-verification' | 'password-reset',
  ): Promise<{ otp: string; user: UserDocument }> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+otp +otpExpiry +otpPurpose')
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const otp = this.generateOtp();
    const otpExpiry = this.getOtpExpiry();

    user.otp = otp;
    user.otpExpiry = otpExpiry;
    user.otpPurpose = purpose;
    await user.save();

    return { otp, user };
  }

  /**
   * Verify OTP
   */
  async verifyOtp(
    email: string,
    otp: string,
    purpose: 'email-verification' | 'password-reset',
  ): Promise<UserDocument> {
    const user = await this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+otp +otpExpiry +otpPurpose')
      .exec();

    if (!user) {
      throw new BadRequestException('User not found');
    }

    if (!user.otp || !user.otpExpiry || !user.otpPurpose) {
      throw new UnauthorizedException('No OTP found. Please request a new one.');
    }

    if (user.otpPurpose !== purpose) {
      throw new UnauthorizedException('Invalid OTP purpose');
    }

    if (user.otpExpiry < new Date()) {
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    if (user.otp !== otp) {
      throw new UnauthorizedException('Invalid OTP');
    }

    // OTP is valid, clear it
    user.otp = undefined;
    user.otpExpiry = undefined;
    user.otpPurpose = undefined;

    // If this is email verification, mark email as verified
    if (purpose === 'email-verification') {
      user.emailVerified = true;
    }

    await user.save();

    return user;
  }

  /**
   * Clear OTP for a user
   */
  async clearOtp(email: string): Promise<void> {
    await this.userModel.updateOne(
      { email: email.toLowerCase() },
      {
        $unset: {
          otp: 1,
          otpExpiry: 1,
          otpPurpose: 1,
        },
      },
    );
  }
}
