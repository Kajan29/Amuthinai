import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ChatService } from 'src/modules/chat/chat.service';
import { PointsService } from 'src/modules/points/points.service';

import { DonationsService } from './donations.service';
import { CreateDonationDto } from './dto/create-donation.dto';
import { QueryDonationsDto } from './dto/query-donations.dto';
import { RejectDonationDto } from './dto/review-donation.dto';
import { SendMessageDto } from 'src/modules/chat/dto/send-message.dto';

@ApiTags('donations')
@ApiBearerAuth()
@Controller('donations')
export class DonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly chatService: ChatService,
    private readonly pointsService: PointsService,
  ) {}

  @Post()
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'FR2, FR3 — post a donation for admin review' })
  create(@CurrentUser('id') donorId: string, @Body() dto: CreateDonationDto) {
    return this.donationsService.create(donorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Donors see their own donations; admins see all' })
  findAll(@CurrentUser() user: AuthUser, @Query() query: QueryDonationsDto) {
    const scope = user.role === Role.Donor ? { donorId: user.id } : undefined;
    return this.donationsService.findAll(query, scope);
  }

  @Get('stats')
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'Dashboard counters for the signed-in donor' })
  async stats(@CurrentUser('id') donorId: string) {
    const [totals, points] = await Promise.all([
      this.donationsService.statsFor(donorId),
      this.pointsService.balanceOf(donorId),
    ]);

    return { ...totals, karmaPoints: points };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.donationsService.findById(id);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'FR12 — append-only status log' })
  timeline(@Param('id') id: string) {
    return this.donationsService.timeline(id);
  }

  @Post(':id/cancel')
  @Roles(Role.Donor)
  cancel(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    return this.donationsService.cancel(id, donorId);
  }

  @Post(':id/approve')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR4 — approve so the donation can be assigned' })
  approve(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.donationsService.approve(id, adminId);
  }

  @Post(':id/reject')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'FR4 — reject with a reason shown to the donor' })
  reject(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: RejectDonationDto,
  ) {
    return this.donationsService.reject(id, adminId, dto.reason);
  }

  @Post(':id/flag')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Flag a donation for quality or safety review' })
  flag(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ) {
    return this.donationsService.flag(id, adminId, reason ?? 'Flagged for quality check');
  }

  @Get(':id/messages')
  messages(@Param('id') id: string) {
    return this.chatService.findByDonation(id);
  }

  @Post(':id/messages')
  sendMessage(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() dto: SendMessageDto) {
    return this.chatService.send(id, user, dto.body);
  }
}
