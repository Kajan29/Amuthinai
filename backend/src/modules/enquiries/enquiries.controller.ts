import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { CurrentUser, type AuthUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';

import {
  CreateEnquiryDto,
  QueryEnquiriesDto,
  RespondEnquiryDto,
  ResolveEnquiryDto,
} from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

class EnquiryStatusDto {
  @IsIn(['open', 'in_review', 'resolved'])
  status!: 'open' | 'in_review' | 'resolved';
}

@ApiTags('enquiries')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'FR12 — raise a concern with the admin team' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admins see every enquiry; everyone else sees their own' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryEnquiriesDto) {
    const scope =
      user.role === Role.Admin
        ? { status: query.status }
        : { raisedBy: user.id, status: query.status };
    return this.enquiriesService.findAll(query, scope);
  }

  @Get(':id/evidence')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Donation history, proofs, timestamps and messages for a dispute' })
  evidence(@Param('id') id: string) {
    return this.enquiriesService.evidence(id);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.enquiriesService.findVisible(id, user);
  }

  @Post(':id/responses')
  @ApiOperation({ summary: 'Reply on an enquiry thread' })
  respond(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: RespondEnquiryDto,
  ) {
    return this.enquiriesService.respond(id, user, dto.message);
  }

  @Patch(':id/status')
  @Roles(Role.Admin)
  setStatus(@Param('id') id: string, @Body() dto: EnquiryStatusDto) {
    return this.enquiriesService.setStatus(id, dto.status);
  }

  @Patch(':id/resolve')
  @Roles(Role.Admin)
  resolve(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ResolveEnquiryDto,
  ) {
    return this.enquiriesService.resolve(id, adminId, dto.resolution);
  }
}
