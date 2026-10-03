import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import type { AuthUser } from 'src/common/decorators/current-user.decorator';

import { ChatMessage, ChatMessageDocument } from './schemas/chat-message.schema';

@Injectable()
export class ChatService {
  constructor(@InjectModel(ChatMessage.name) private readonly model: Model<ChatMessage>) {}

  findByDonation(donationId: string) {
    return this.model.find({ donationId }).sort({ sentAt: 1 }).exec();
  }

  send(donationId: string, sender: AuthUser, body: string): Promise<ChatMessageDocument> {
    return this.model.create({
      donationId: new Types.ObjectId(donationId),
      senderId: new Types.ObjectId(sender.id),
      senderRole: sender.role,
      body,
    });
  }

  countForDonation(donationId: string) {
    return this.model.countDocuments({ donationId }).exec();
  }
}
