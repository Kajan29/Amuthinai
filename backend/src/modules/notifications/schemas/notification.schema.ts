import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

export type NotificationDocument = HydratedDocument<Notification>;

export type NotificationType =
  | 'donation'
  | 'assignment'
  | 'urgent'
  | 'pickup'
  | 'delivery'
  | 'delay'
  | 'enquiry'
  | 'request'
  | 'points'
  | 'system';

export const NOTIFICATION_TYPES: NotificationType[] = [
  'donation',
  'assignment',
  'urgent',
  'pickup',
  'delivery',
  'delay',
  'enquiry',
  'request',
  'points',
  'system',
];

/** In-app inbox entry; every push is also stored here so nothing is lost when push fails. */
@Schema({
  timestamps: true,
  toJSON: {
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      return record;
    },
  },
})
export class Notification {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  title!: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  body!: string;

  @ApiProperty({ enum: NOTIFICATION_TYPES })
  @Prop({ type: String, enum: NOTIFICATION_TYPES, default: 'system' })
  type!: NotificationType;

  @ApiPropertyOptional()
  @Prop({ type: Object, default: {} })
  data!: Record<string, string>;

  @ApiProperty({ default: false })
  @Prop({ default: false, index: true })
  read!: boolean;

  @ApiProperty()
  createdAt!: Date;
}

export const NotificationSchema = SchemaFactory.createForClass(Notification);

NotificationSchema.index({ userId: 1, createdAt: -1 });
