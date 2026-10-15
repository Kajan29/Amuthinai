import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser, type AuthUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { Role } from 'src/common/enums/role.enum';
import { ChatService } from 'src/modules/chat/chat.service';
import { PointsService } from 'src/modules/points/points.service';
import { UsersService } from 'src/modules/users/users.service';

import { DonationsService } from './donations.service';
import type { DonationDocument } from './schemas/donation.schema';
import { ClaimDonationDto, LinkRequestDto } from './dto/claim-donation.dto';
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
    private readonly usersService: UsersService,
  ) {}

  @Post()
  @Roles(Role.Donor)
  @ApiOperation({ summary: 'FR2, FR3 — post a donation for admin review' })
  create(@CurrentUser('id') donorId: string, @Body() dto: CreateDonationDto) {
    return this.donationsService.create(donorId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Donors see their own donations; admins see all' })
  async findAll(@CurrentUser() user: AuthUser, @Query() query: QueryDonationsDto) {
    const scope = user.role === Role.Donor ? { donorId: user.id } : undefined;
    const page = await this.donationsService.findAll(query, scope);
    if (user.role !== Role.Admin) return page;
    return { ...page, items: await this.withDonor(page.items) };
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
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const donation =
      user.role === Role.Donor
        ? await this.donationsService.findOwned(id, user.id)
        : await this.donationsService.findById(id);
    if (user.role !== Role.Admin) return donation;
    const [[withDonor], recipient] = await Promise.all([
      this.withDonor([donation]),
      this.recipientFor(donation),
    ]);
    return { ...withDonor, recipient };
  }

  @Post(':id/claim')
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'Claim a general donation; only the first recipient succeeds' })
  claim(
    @CurrentUser('id') recipientId: string,
    @Param('id') id: string,
    @Body() dto: ClaimDonationDto,
  ) {
    return this.donationsService.claim(id, recipientId, dto);
  }

  @Post(':id/link-request')
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Pair an unclaimed general donation with an open recipient request' })
  linkRequest(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: LinkRequestDto,
  ) {
    return this.donationsService.linkRequest(id, dto.requestId, adminId);
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

  /** Admin views show who donated; donor contact details are never sent to other roles here. */
  private async withDonor(donations: DonationDocument[]) {
    const donorIds = [...new Set(donations.map((donation) => donation.donorId.toString()))];
    const donors = await this.usersService.findManyByIds(donorIds);
    const byId = new Map(donors.map((donor) => [donor.id as string, donor]));

    return donations.map((donation) => {
      const donor = byId.get(donation.donorId.toString());
      return {
        ...donation.toJSON(),
        donor: donor
          ? { id: donor.id as string, name: donor.name, phone: donor.phone, email: donor.email }
          : null,
      };
    });
  }

  /** The recipient the admin is approving this donation for, if one is confirmed. */
  private async recipientFor(donation: DonationDocument) {
    const request = await this.donationsService.recipientOf(donation);
    if (!request) return null;
    const [person] = await this.usersService.findManyByIds([request.recipientId.toString()]);
    return {
      requestId: request.id as string,
      origin: request.origin ?? 'request',
      status: request.status,
      name: person?.name ?? 'Recipient',
      phone: request.contactPhone ?? person?.phone ?? null,
      servingsNeeded: request.servingsNeeded,
      familySize: request.familySize ?? null,
      neededBy: request.neededBy,
      notes: request.notes ?? null,
      dietaryRequirements: request.dietaryRequirements ?? [],
      dropAddress: request.dropAddress,
    };
  }
}
