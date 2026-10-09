import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import { ChangeRoleDto, SetActiveDto } from './dto/admin-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdateVolunteerProfileDto } from './dto/update-volunteer-profile.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Current user profile' })
  me(@CurrentUser('id') userId: string) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update name, phone, language, address or push token' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.usersService.update(userId, dto);
  }

  @Patch('me/volunteer-profile')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR7 — set vehicle type and travel radius' })
  updateVolunteerProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateVolunteerProfileDto,
  ) {
    return this.usersService.updateVolunteerProfile(userId, dto);
  }

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'List users, filtered by role and verification state' })
  findAll(@Query() query: QueryUsersDto) {
    return this.usersService.findAll(query);
  }

  @Post('batch-verify')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Batch verify multiple volunteers' })
  batchVerify(@Body('userIds') userIds: string[]) {
    return this.usersService.batchVerify(userIds ?? []);
  }

  @Get(':id')
  @Roles(Role.Admin)
  findOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Post(':id/verify')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Verify a volunteer so they start receiving offers' })
  verify(@Param('id') id: string) {
    return this.usersService.verify(id);
  }

  @Post(':id/flag')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Flag a volunteer for review' })
  flag(@Param('id') id: string, @Body('reason') reason?: string) {
    return this.usersService.flag(id, reason ?? 'Flagged by admin');
  }

  @Patch(':id/role')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Change a user role (admin only)' })
  changeRole(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.usersService.changeRole(id, dto.role, adminId);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Activate or deactivate a user account' })
  setStatus(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: SetActiveDto,
  ) {
    return this.usersService.setActive(id, dto.isActive, adminId);
  }
}
