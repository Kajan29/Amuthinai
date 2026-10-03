import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Roles } from 'src/common/decorators/roles.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';
import { Role } from 'src/common/enums/role.enum';

import { CreateFoodRequestDto } from './dto/create-food-request.dto';
import { FoodRequestsService } from './food-requests.service';

@ApiTags('food-requests')
@ApiBearerAuth()
@Controller('food-requests')
export class FoodRequestsController {
  constructor(private readonly foodRequestsService: FoodRequestsService) {}

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

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.foodRequestsService.findById(id);
  }

  @Post(':id/cancel')
  @Roles(Role.Recipient)
  cancel(@CurrentUser('id') recipientId: string, @Param('id') id: string) {
    return this.foodRequestsService.cancel(id, recipientId);
  }
}
