import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { ChatService } from './chat.service';
import { ChatMessage, ChatMessageSchema } from './schemas/chat-message.schema';

/** Messages are reached through /donations/:id/messages, so this module has no controller. */
@Module({
  imports: [MongooseModule.forFeature([{ name: ChatMessage.name, schema: ChatMessageSchema }])],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
