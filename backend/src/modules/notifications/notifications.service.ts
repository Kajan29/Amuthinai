import { Injectable, Logger } from '@nestjs/common';
import { Expo, type ExpoPushMessage } from 'expo-server-sdk';

import { UsersService } from 'src/modules/users/users.service';

export interface PushPayload {
  title: string;
  body: string;
  /** Deep link the app opens when the notification is tapped. */
  data?: Record<string, string>;
}

/** FR8 — push delivery through Expo's service. */
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly expo = new Expo();

  constructor(private readonly usersService: UsersService) {}

  async sendToUsers(userIds: string[], payload: PushPayload): Promise<void> {
    const tokens = await this.usersService.getPushTokens(userIds);
    await this.sendToTokens(tokens, payload);
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
        // A failed push must never fail the request that triggered it.
        this.logger.warn(`Push delivery failed for ${chunk.length} device(s)`, error as Error);
      }
    }
  }
}
