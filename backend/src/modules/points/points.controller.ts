import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';

import { PointsService } from './points.service';

@ApiTags('points')
@ApiBearerAuth()
@Controller('points')
export class PointsController {
  constructor(private readonly pointsService: PointsService) {}

  @Get('me')
  @ApiOperation({ summary: 'FR10 — balance, tier, rank and recent ledger entries' })
  me(@CurrentUser('id') userId: string) {
    return this.pointsService.summaryFor(userId);
  }

  @Get('leaderboard')
  leaderboard() {
    return this.pointsService.leaderboard();
  }
}
