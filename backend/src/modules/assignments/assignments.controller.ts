import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';
import { HandoverDto } from 'src/modules/delivery-proof/dto/handover.dto';
import { SubmitProofDto } from 'src/modules/delivery-proof/dto/submit-proof.dto';

import { AssignmentsService } from './assignments.service';
import {
  ChooseDeliveryMethodDto,
  CreateAssignmentDto,
  NgoFallbackDto,
  ReassignDto,
} from './dto/create-assignment.dto';
import { DeclineAssignmentDto } from './dto/decline-assignment.dto';
import { NearbyQueryDto } from './dto/nearby-query.dto';
import { QueryAssignmentsDto } from './dto/query-assignments.dto';

@ApiTags('assignments')
@ApiBearerAuth()
@Controller('assignments')
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Admin lists all assignments and deliveries' })
  findAll(@Query() query: QueryAssignmentsDto) {
    return this.assignmentsService.findAll(query);
  }

  @Get('monitor')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Live assignments with urgency and delay alerts' })
  monitor() {
    return this.assignmentsService.monitor();
  }

  @Get('suggestions/:donationId')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR6, FR7 — ranked volunteers for a donation' })
  suggestions(@Param('donationId') donationId: string) {
    return this.assignmentsService.suggestVolunteers(donationId);
  }

  @Get('options/:donationId')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Volunteers, nearby recipient requests and NGOs for a donation' })
  options(@Param('donationId') donationId: string) {
    return this.assignmentsService.assignmentOptions(donationId);
  }

  @Post()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR6 — offer a donation to a volunteer' })
  create(@CurrentUser('id') adminId: string, @Body() dto: CreateAssignmentDto) {
    return this.assignmentsService.create(adminId, dto);
  }

  @Post('method')
  @Roles(Role.Admin)
  @ApiOperation({
    summary: 'Choose volunteer delivery, recipient self-pickup or donor self-delivery',
  })
  chooseMethod(@CurrentUser('id') adminId: string, @Body() dto: ChooseDeliveryMethodDto) {
    return this.assignmentsService.chooseDeliveryMethod(adminId, dto.donationId, dto.method);
  }

  @Post('ngo')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'NGO fallback when no volunteer is available' })
  assignToNgo(@CurrentUser('id') adminId: string, @Body() dto: NgoFallbackDto) {
    return this.assignmentsService.assignToNgo(adminId, dto);
  }

  @Get('nearby')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR8 — live and open tasks ordered by urgency' })
  nearby(@CurrentUser('id') volunteerId: string, @Query() query: NearbyQueryDto) {
    const origin =
      query.lat !== undefined && query.lng !== undefined
        ? ([query.lng, query.lat] as [number, number])
        : undefined;
    return this.assignmentsService.findNearbyFor(volunteerId, origin);
  }

  @Get('mine')
  @Roles(Role.Volunteer)
  mine(@CurrentUser('id') volunteerId: string, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.findMine(volunteerId, query);
  }

  @Get('history')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'Accepted, completed and cancelled tasks with full details' })
  history(@CurrentUser('id') volunteerId: string, @Query() query: PaginationQueryDto) {
    return this.assignmentsService.historyFor(volunteerId, query);
  }

  @Get('for-request/:requestId')
  @Roles(Role.Recipient, Role.Admin)
  @ApiOperation({ summary: 'Recipient live tracking info for a food request' })
  getForRequest(@CurrentUser() user: AuthUser, @Param('requestId') requestId: string) {
    return this.assignmentsService.getTrackingForRequest(requestId, user);
  }

  @Get('for-donation/:donationId')
  @Roles(Role.Donor, Role.Admin)
  @ApiOperation({ summary: 'Donor sees the volunteer, pickup PIN and proof for a donation' })
  getForDonation(@CurrentUser() user: AuthUser, @Param('donationId') donationId: string) {
    return this.assignmentsService.forDonation(donationId, user);
  }

  @Get(':id/details')
  @Roles(Role.Volunteer, Role.Admin)
  @ApiOperation({ summary: 'Task details: food, pickup, drop-off, contacts and proofs' })
  details(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.details(id, user);
  }

  @Get(':id')
  @Roles(Role.Volunteer, Role.Admin)
  findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.assignmentsService.findVisible(id, user);
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

  @Post(':id/reassign')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Move a live task to another volunteer' })
  reassign(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: ReassignDto,
  ) {
    return this.assignmentsService.reassign(id, adminId, dto);
  }

  @Post(':id/ngo-complete')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Record that the NGO collected and distributed the food' })
  completeNgo(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.assignmentsService.completeNgo(id, adminId);
  }

  @Post(':id/pickup')
  @Roles(Role.Volunteer)
  @ApiOperation({ summary: 'FR9 — photo, location and donor PIN at collection' })
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

  @Post(':id/depart')
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'Donor self-delivery — the donor has left with the food' })
  depart(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    return this.assignmentsService.departWithFood(id, donorId);
  }

  @Post(':id/handover')
  @Roles(Role.Donor, Role.Admin)
  @ApiOperation({ summary: "In-person handover, confirmed with the recipient's code" })
  handover(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: HandoverDto) {
    return this.assignmentsService.confirmHandover(id, user, dto);
  }
}
