import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';

import { CreateEnquiryDto, ResolveEnquiryDto } from './dto/create-enquiry.dto';
import { EnquiriesService } from './enquiries.service';

@ApiTags('enquiries')
@ApiBearerAuth()
@Controller('enquiries')
export class EnquiriesController {
  constructor(private readonly enquiriesService: EnquiriesService) {}

  @Post()
  @ApiOperation({ summary: 'FR12 — raise a concern with the admin team' })
  create(@CurrentUser('id') userId: string, @Body() dto: CreateEnquiryDto) {
    return this.enquiriesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Admins see every enquiry; everyone else sees their own' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: PaginationQueryDto) {
    const scope = user.role === Role.Admin ? undefined : { raisedBy: user.id };
    return this.enquiriesService.findAll(query, scope);
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
