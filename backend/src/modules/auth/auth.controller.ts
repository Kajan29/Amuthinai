import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Public } from 'src/common/decorators/public.decorator';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';
import { SelectRoleDto } from './dto/select-role.dto';
import { UsersService } from 'src/modules/users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'FR1 — create an account' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'FR1 — exchange credentials for tokens' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new pair' })
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Patch('role')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'FR1 — choose donor, volunteer or recipient' })
  selectRole(@CurrentUser('id') userId: string, @Body() dto: SelectRoleDto) {
    return this.authService.selectRole(userId, dto.role);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resolve the bearer token to a user' })
  me(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }
}
