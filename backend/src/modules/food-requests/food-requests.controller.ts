import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { RequestStatus } from 'src/common/enums/request-status.enum';
import { Role } from 'src/common/enums/role.enum';

import { CreateFoodRequestDto } from './dto/create-food-request.dto';
import { FoodRequestsService } from './food-requests.service';
import { DonationsService } from '../donations/donations.service';
import { QueryDonationsDto } from '../donations/dto/query-donations.dto';

import { QueryFoodRequestsDto } from './dto/query-food-requests.dto';

@ApiTags('food-requests')
@ApiBearerAuth()
@Controller('food-requests')
export class FoodRequestsController {
  constructor(
    private readonly foodRequestsService: FoodRequestsService,
    private readonly donationsService: DonationsService,
  ) {}

  @Get()
  @Roles(Role.Admin)
  @ApiOperation({ summary: 'Admin lists all recipient food requests' })
  findAll(@Query() query: QueryFoodRequestsDto) {
    return this.foodRequestsService.findAll(query);
  }

  @Post()
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'FR5 — raise a food request with a map pin' })
  create(@CurrentUser('id') recipientId: string, @Body() dto: CreateFoodRequestDto) {
    return this.foodRequestsService.create(recipientId, dto);
  }

  @Get('mine')
  @Roles(Role.Recipient)
  findMine(@CurrentUser('id') recipientId: string, @Query() query: PaginationQueryDto) {
    return this.foodRequestsService.findMine(recipientId, query);
  }

  @Get('stats')
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'Dashboard counters for the signed-in recipient' })
  async stats(@CurrentUser('id') recipientId: string) {
    return this.foodRequestsService.statsFor(recipientId);
  }

  @Get('available-distributions')
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'Get available approved donations near recipient location' })
  async availableDistributions(
    @CurrentUser('id') recipientId: string,
    @Query() query: QueryDonationsDto,
  ) {
    return this.donationsService.getAvailableForRecipient(recipientId, query);
  }

  @Get('nearby-active')
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'Check for nearby active requests within 1km' })
  async getNearbyActive(
    @CurrentUser('id') recipientId: string,
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radiusKm') radiusKm: number = 1,
  ) {
    if (!lat || !lng) return [];
    return this.foodRequestsService.findNearby(
      [Number(lng), Number(lat)],
      Number(radiusKm) || 1,
      recipientId,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodRequestsService.findById(id);
  }

  @Patch(':id')
  @Roles(Role.Recipient)
  @ApiOperation({ summary: 'Update an open food request' })
  update(
    @CurrentUser('id') recipientId: string,
    @Param('id') id: string,
    @Body() dto: Partial<CreateFoodRequestDto>,
  ) {
    return this.foodRequestsService.update(id, recipientId, dto);
  }

  @Post(':id/cancel')
  @Roles(Role.Recipient)
  cancel(@CurrentUser('id') recipientId: string, @Param('id') id: string) {
    return this.foodRequestsService.cancel(id, recipientId);
  }
}
