import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

export type EnquiryDocument = HydratedDocument<Enquiry>;

export type EnquiryStatus = 'open' | 'in_review' | 'resolved';

@Schema({ _id: false })
export class EnquiryResponse {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  authorId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true })
  authorName!: string;

  @ApiProperty()
  @Prop({ required: true })
  authorRole!: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  message!: string;

  @ApiProperty()
  @Prop({ default: () => new Date() })
  createdAt!: Date;
}

const EnquiryResponseSchema = SchemaFactory.createForClass(EnquiryResponse);

/** FR12 — a concern raised by a recipient (or volunteer) and worked by an admin. */
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
export class Enquiry {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  raisedBy!: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop({ type: String })
  raisedByRole?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'Donation' })
  donationId?: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'Assignment' })
  assignmentId?: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'FoodRequest' })
  requestId?: Types.ObjectId;

  @ApiPropertyOptional({ description: 'e.g. late_delivery, food_quality, wrong_location, other' })
  @Prop({ trim: true })
  category?: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  subject!: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  body!: string;

  @ApiProperty({ enum: ['open', 'in_review', 'resolved'] })
  @Prop({
    type: String,
    enum: ['open', 'in_review', 'resolved'],
    default: 'open',
    index: true,
  })
  status!: EnquiryStatus;

  @ApiProperty({ type: [EnquiryResponse] })
  @Prop({ type: [EnquiryResponseSchema], default: [] })
  responses!: EnquiryResponse[];

  @ApiPropertyOptional()
  @Prop({ trim: true })
  resolution?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop()
  resolvedAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);

EnquirySchema.index({ status: 1, createdAt: -1 });
