import { Controller, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'The signed-in user’s notification inbox, newest first' })
  list(@CurrentUser('id') userId: string, @Query() query: PaginationQueryDto) {
    return this.notificationsService.listFor(userId, query);
  }

  @Get('unread-count')
  async unreadCount(@CurrentUser('id') userId: string) {
    return { unread: await this.notificationsService.unreadCount(userId) };
  }

  @Patch(':id/read')
  markRead(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.notificationsService.markRead(id, userId);
  }

  @Post('read-all')
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }
}
