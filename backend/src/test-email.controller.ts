import { Controller, Get } from '@nestjs/common';
import { EmailService } from './modules/email/email.service';

@Controller('test')
export class TestEmailController {
  constructor(private readonly emailService: EmailService) {}

  @Get('email')
  async testEmail() {
    try {
      await this.emailService.sendOtpEmail({
        to: 'mugunthantharshanan2004@gmail.com',
        name: 'Tharsu',
        otp: '123456',
        purpose: 'email-verification',
      });

      return {
        success: true,
        message: 'Test email sent successfully! Check mugunthantharshanan2004@gmail.com inbox (and spam)',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send email',
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}
