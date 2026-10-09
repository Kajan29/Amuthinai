import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';
import { Model, Types } from 'mongoose';

import { paginate, PaginationQueryDto, type PaginatedDto } from 'src/common/dto/pagination.dto';
import { UsersService } from 'src/modules/users/users.service';

import {
  Notification,
  NotificationDocument,
  type NotificationType,
} from './schemas/notification.schema';

export interface PushPayload {
  title: string;
  body: string;
  /** Inbox category, used for the icon in the app. */
  type?: NotificationType;
  /** Deep link the app opens when the notification is tapped. */
  data?: Record<string, string>;
}

/** FR8 — every alert is stored in the user's inbox and pushed through Expo. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(
    @InjectModel(Notification.name) private readonly model: Model<Notification>,
    private readonly usersService: UsersService,
  ) {}

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const unique = [...new Set(userIds.filter(Boolean))];
    if (unique.length === 0) return;

    try {
      await this.model.insertMany(
        unique.map((userId) => ({
          userId: new Types.ObjectId(userId),
          title: payload.title,
          body: payload.body,
          type: payload.type ?? 'system',
          data: payload.data ?? {},
        })),
      );
    } catch (error) {
      // An inbox write must never fail the request that triggered it.
      this.logger.warn('Could not store notifications', error as Error);
    }

    const tokens = await this.usersService.getPushTokens(unique);
    await this.sendToTokens(tokens, payload);
  }

  async sendToAdmins(payload: PushPayload): Promise<void> {
    const adminIds = await this.usersService.adminIds();
    await this.sendToUsers(adminIds, payload);
  }

  async sendToTokens(tokens: string[], payload: PushPayload): Promise<void> {
    const messages: ExpoPushMessage[] = tokens
      .filter((token) => Expo.isExpoPushToken(token))
      .map((token) => ({
        to: token,
        sound: 'default',
        channelId: 'urgent-pickups',
        title: payload.title,
        body: payload.body,
        data: payload.data,
      }));

    if (messages.length === 0) return;

    // Expo accepts up to 100 messages per request; the SDK chunks for us.
    for (const chunk of this.expo.chunkPushNotifications(messages)) {
      try {
        await this.expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        this.logger.warn(`Push delivery failed for ${chunk.length} device(s)`, error as Error);
      }
    }
  }

  async listFor(
    userId: string,
    query: PaginationQueryDto,
  ): Promise<PaginatedDto<NotificationDocument> & { unread: number }> {
    const filter = { userId: new Types.ObjectId(userId) };
    const [items, total, unread] = await Promise.all([
      this.model.find(filter).sort({ createdAt: -1 }).skip(query.skip).limit(query.pageSize),
      this.model.countDocuments(filter),
      this.model.countDocuments({ ...filter, read: false }),
    ]);
    return { ...paginate(items, total, query), unread };
  }

  unreadCount(userId: string): Promise<number> {
    return this.model.countDocuments({ userId: new Types.ObjectId(userId), read: false }).exec();
  }

  async markRead(id: string, userId: string): Promise<NotificationDocument> {
    const notification = await this.model
      .findOneAndUpdate(
        { _id: id, userId: new Types.ObjectId(userId) },
        { read: true },
        { new: true },
      )
      .exec();
    if (!notification) throw new NotFoundException('Notification not found');
    return notification;
  }

  async markAllRead(userId: string): Promise<{ modifiedCount: number }> {
    const result = await this.model
      .updateMany({ userId: new Types.ObjectId(userId), read: false }, { read: true })
      .exec();
    return { modifiedCount: result.modifiedCount };
  }
}
