import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

export type EnquiryDocument = HydratedDocument<Enquiry>;

export type EnquiryStatus = 'open' | 'in_review' | 'resolved';

/** FR12 — a concern raised by a recipient and worked by an admin. */
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
  @Prop({ type: Types.ObjectId, ref: 'Donation' })
  donationId?: Types.ObjectId;

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

  @ApiPropertyOptional()
  @Prop({ trim: true })
  resolution?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'User' })
  resolvedBy?: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop()
  resolvedAt?: Date;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);

EnquirySchema.index({ status: 1, createdAt: -1 });
