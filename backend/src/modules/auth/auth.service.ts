import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, type JwtSignOptions } from '@nestjs/jwt';

import { Role } from 'src/common/enums/role.enum';
import { UsersService } from 'src/modules/users/users.service';
import type { UserDocument } from 'src/modules/users/schemas/user.schema';

import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import type { JwtPayload } from './strategies/jwt.strategy';

export interface AuthResponse {
  user: UserDocument;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** FR1 — the account exists but has no role until select-role is called. */
  async register(dto: RegisterDto): Promise<AuthResponse> {
    const user = await this.usersService.create(dto);
    return this.issueTokens(user);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const user = await this.usersService.findByEmailWithPassword(dto.email);

    // One message for both cases so the response cannot be used to enumerate accounts.
    const isValid =
      user && (await this.usersService.comparePassword(dto.password, user.passwordHash));
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

  private async issueTokens(user: UserDocument): Promise<AuthResponse> {
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
