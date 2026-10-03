import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';
import { SubmitProofDto } from 'src/modules/delivery-proof/dto/submit-proof.dto';

import { AssignmentsService } from './assignments.service';
import { CreateAssignmentDto } from './dto/create-assignment.dto';
import { DeclineAssignmentDto } from './dto/decline-assignment.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get('suggestions/:donationId')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR6, FR7 — ranked volunteers for a donation' })
  suggestions(@Param('donationId') donationId: string) {
    return this.assignmentsService.suggestVolunteers(donationId);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR6 — offer a donation to a volunteer' })
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(adminId, dto);
  }

  @Get('nearby')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR8 — open tasks ordered by remaining safe time' })
  nearby(@CurrentUser('id') volunteerId: string) {
    return this.assignmentsService.findNearbyFor(volunteerId);
  }

  @Get('mine')
  @Roles(Role.Volunteer)
  mine(@CurrentUser('id') volunteerId: string, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.findMine(volunteerId, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.assignmentsService.findById(id);
  }

  @Post(':id/accept')
  @Roles(Role.Volunteer)
  accept(@CurrentUser('id') volunteerId: string, @Param('id') id: string) {
    return this.assignmentsService.accept(id, volunteerId);
  }

  @Post(':id/decline')
  @Roles(Role.Volunteer)
  decline(
    @CurrentUser('id') volunteerId: string,
    @Param('id') id: string,
    @Body() dto: DeclineAssignmentDto,
  ) {
    return this.assignmentsService.decline(id, volunteerId, dto.reason);
  }

  @Post(':id/pickup')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR9 — photo and location proof of collection' })
  confirmPickup(
    @CurrentUser('id') volunteerId: string,
    @Param('id') id: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.assignmentsService.confirmPickup(id, volunteerId, dto);
  }

  @Post(':id/delivery')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR9 — photo, location and recipient PIN' })
  confirmDelivery(
    @CurrentUser('id') volunteerId: string,
    @Param('id') id: string,
    @Body() dto: SubmitProofDto,
  ) {
    return this.assignmentsService.confirmDelivery(id, volunteerId, dto);
  }
}
