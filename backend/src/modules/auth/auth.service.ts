import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';
import { OAuth2Client } from 'google-auth-library';
import * as bcrypt from 'bcrypt';

import { Role } from 'src/common/enums/role.enum';
import { UsersService } from 'src/modules/users/users.service';
import type { UserDocument } from 'src/modules/users/schemas/user.schema';
import { EmailService } from 'src/modules/email/email.service';
import { OtpService } from './otp.service';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private googleClient: OAuth2Client | null = null;

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailService: EmailService,
    private readonly otpService: OtpService,
  ) {
    // Initialize Google OAuth2 client
    const googleClientId = this.config.get<string>('GOOGLE_CLIENT_ID');
    if (googleClientId) {
      this.googleClient = new OAuth2Client(googleClientId);
    }
  }

  /** FR1 — role is set during registration but can be updated if not yet set */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(dto);
    console.log('User created:', user.email);
    
    // Send email verification OTP
    try {
      console.log('Creating OTP for email verification...');
      const { otp } = await this.otpService.createOtp(user.email, 'email-verification');
      console.log('OTP created:', otp, 'for', user.email);
      
      console.log('Sending verification email...');
      await this.emailService.sendOtpEmail({
        to: user.email,
        name: user.name,
        otp,
        purpose: 'email-verification',
      });
      console.log('Verification email sent successfully to:', user.email);
    } catch (error) {
      console.error('Failed to send verification email:', error);
      console.error('Error details:', error instanceof Error ? error.message : error);
      // Don't fail registration if email sending fails
    }
    
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // One message for both cases so the response cannot be used to enumerate accounts.
    const isValid =
      user && user.passwordHash && (await this.usersService.comparePassword(dto.password, user.passwordHash));
    if (!user || !isValid) throw new UnauthorizedException('Email or password is incorrect');

    return this.issueTokens(user);
  }

  /** FR1 */
  async selectRole(userId: string, role: Role): Promise<UserDocument> {
    return this.usersService.assignRole(userId, role);
  }

  async refresh(refreshToken: string): Promise<AuthResponse> {
    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
      });
    } catch {
      throw new UnauthorizedException('Session expired, please log in again');
    }

    const user = await this.usersService.findById(payload.sub);
    return this.issueTokens(user);
  }

  /** Google OAuth authentication */
  async googleAuth(dto: GoogleAuthDto): Promise<AuthResponse> {
    if (!this.googleClient) {
      throw new UnauthorizedException('Google authentication is not configured');
    }

    try {
      // Verify the Google ID token
      const ticket = await this.googleClient.verifyIdToken({
        idToken: dto.idToken,
        audience: this.config.get<string>('GOOGLE_CLIENT_ID'),
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token');
      }

      // Check if user exists
      let user = await this.usersService.findByEmail(payload.email);

      if (!user) {
        // Create new user from Google profile
        user = await this.usersService.createGoogleUser({
          email: payload.email,
          name: payload.name || payload.email.split('@')[0],
          googleId: payload.sub,
          role: dto.role,
        });
      } else if (dto.role && !user.role) {
        // Update role if provided and user doesn't have one
        user = await this.usersService.assignRole(user.id as string, dto.role);
      }

      return this.issueTokens(user);
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Failed to authenticate with Google');
    }
  }

  /**
   * Send OTP for password reset
   */
  async forgotPassword(dto: ForgotPasswordDto): Promise<{ message: string }> {
    const { otp, user } = await this.otpService.createOtp(dto.email, 'password-reset');

    await this.emailService.sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      purpose: 'password-reset',
    });

    return { message: 'OTP sent to your email' };
  }

  /**
   * Verify OTP (generic, can be used for both password reset and email verification)
   */
  async verifyOtp(dto: VerifyOtpDto): Promise<{ message: string; valid: boolean }> {
    try {
      await this.otpService.verifyOtp(dto.email, dto.otp, 'password-reset');
      return { message: 'OTP verified successfully', valid: true };
    } catch (error) {
      return { message: error instanceof Error ? error.message : 'Invalid OTP', valid: false };
    }
  }

  /**
   * Reset password using OTP
   */
  async resetPassword(dto: ResetPasswordDto): Promise<{ message: string }> {
    // Verify OTP first
    const user = await this.otpService.verifyOtp(dto.email, dto.otp, 'password-reset');

    // Update password
    const BCRYPT_ROUNDS = 10;
    const passwordHash = await bcrypt.hash(dto.newPassword, BCRYPT_ROUNDS);
    user.passwordHash = passwordHash;
    await user.save();

    // Send confirmation email
    await this.emailService.sendPasswordResetSuccessEmail(user.email, user.name);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<{ message: string }> {
    const user = await this.usersService.findByIdWithPassword(userId);
    if (!user.passwordHash) {
      throw new BadRequestException(
        'This account uses Google sign-in. Use Forgot Password to set a password first.',
      );
    }

    const matches = await this.usersService.comparePassword(dto.currentPassword, user.passwordHash);
    if (!matches) {
      throw new BadRequestException('Current password is incorrect');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('New password must be different from the current password');
    }

    await this.usersService.setPassword(userId, dto.newPassword);
    return { message: 'Password updated successfully' };
  }

  /**
   * Resend verification OTP
   */
  async resendVerificationOtp(email: string): Promise<{ message: string }> {
    const { otp, user } = await this.otpService.createOtp(email, 'email-verification');

    await this.emailService.sendOtpEmail({
      to: user.email,
      name: user.name,
      otp,
      purpose: 'email-verification',
    });

    return { message: 'Verification OTP sent to your email' };
  }

  /**
   * Verify email using OTP
   */
  async verifyEmail(dto: VerifyOtpDto): Promise<{ message: string }> {
    await this.otpService.verifyOtp(dto.email, dto.otp, 'email-verification');
    return { message: 'Email verified successfully' };
  }

  private async issueTokens(user: UserDocument): Promise<AuthResponse> {
    if (user.isActive === false) {
      throw new UnauthorizedException('This account has been deactivated. Contact the Amuthinai admin team.');
    }
    const payload: JwtPayload = { sub: user.id as string, email: user.email, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow<string>('jwt.refreshSecret'),
        expiresIn: this.config.getOrThrow<JwtSignOptions['expiresIn']>('jwt.refreshExpiresIn'),
      }),
    ]);

    return { user, accessToken, refreshToken };
  }
}
