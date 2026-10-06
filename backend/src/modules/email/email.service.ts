import { Injectable, Logger } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';

export interface SendOtpEmailParams {
  to: string;
  name: string;
  otp: string;
  purpose: 'registration' | 'password-reset' | 'email-verification';
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Send OTP email for various purposes
   */
  async sendOtpEmail(params: SendOtpEmailParams): Promise<void> {
    const { to, name, otp, purpose } = params;

    let subject = '';
    let template = '';

    switch (purpose) {
      case 'registration':
        subject = 'Verify Your Email - Amuthinai';
        template = 'verify-email';
        break;
      case 'password-reset':
        subject = 'Reset Your Password - Amuthinai';
        template = 'reset-password';
        break;
      case 'email-verification':
        subject = 'Verify Your Email - Amuthinai';
        template = 'verify-email';
        break;
    }

    try {
      await this.mailerService.sendMail({
        to,
        subject,
        template: `./${template}`,
        context: {
          name,
          otp,
          expiryMinutes: this.config.get('OTP_EXPIRES_IN', '10m').replace('m', ''),
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`OTP email sent successfully to ${to} for ${purpose}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${to}`, error);
      // Don't throw error to prevent blocking the main flow
      // In production, you might want to queue this for retry
    }
  }

  /**
   * Send welcome email after successful registration
   */
  async sendWelcomeEmail(to: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Welcome to Amuthinai! 🍃',
        template: './welcome',
        context: {
          name,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Welcome email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${to}`, error);
    }
  }

  /**
   * Send password reset success notification
   */
  async sendPasswordResetSuccessEmail(to: string, name: string): Promise<void> {
    try {
      await this.mailerService.sendMail({
        to,
        subject: 'Password Reset Successful - Amuthinai',
        template: './password-reset-success',
        context: {
          name,
          year: new Date().getFullYear(),
        },
      });

      this.logger.log(`Password reset success email sent to ${to}`);
    } catch (error) {
      this.logger.error(`Failed to send password reset success email to ${to}`, error);
    }
  }
}
