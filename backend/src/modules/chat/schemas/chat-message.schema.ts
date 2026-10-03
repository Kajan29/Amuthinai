import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { Role } from 'src/common/enums/role.enum';

export type ChatMessageDocument = HydratedDocument<ChatMessage>;

/** Conversation attached to a donation. Retained after delivery for dispute resolution. */
@Schema({
  timestamps: { createdAt: 'sentAt', updatedAt: false },
  toJSON: {
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      return record;
    },
  },
})
export class ChatMessage {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Donation', required: true, index: true })
  donationId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  senderId!: Types.ObjectId;

  @ApiProperty({ enum: Role })
  @Prop({ type: String, enum: Role, required: true })
  senderRole!: Role;

  @ApiProperty()
  @Prop({ required: true, trim: true, maxlength: 1000 })
  body!: string;

  @ApiProperty()
  sentAt!: Date;
}

export const ChatMessageSchema = SchemaFactory.createForClass(ChatMessage);

ChatMessageSchema.index({ donationId: 1, sentAt: 1 });
