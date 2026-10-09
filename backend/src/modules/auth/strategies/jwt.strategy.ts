import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import type { AuthUser } from 'src/common/decorators/current-user.decorator';
import { UsersService } from 'src/modules/users/users.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('jwt.secret'),
    });
  }

  /**
   * The role is read from the database rather than the token, so a role change or a
   * revoked verification takes effect immediately instead of at token expiry.
   */
  async validate(payload: JwtPayload): Promise<AuthUser> {
    const user = await this.usersService.findById(payload.sub).catch(() => null);
    if (!user?.role) throw new UnauthorizedException('Finish choosing a role to continue');
    if (user.isActive === false) throw new UnauthorizedException('This account has been deactivated');

    return { id: user.id as string, email: user.email, role: user.role };
  }
}
