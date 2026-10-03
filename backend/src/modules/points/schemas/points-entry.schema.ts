import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

export type PointsEntryDocument = HydratedDocument<PointsEntry>;

/** FR10 — immutable ledger; a balance is always the sum of its entries, never a stored total. */
@Schema({
  timestamps: { createdAt: 'awardedAt', updatedAt: false },
  toJSON: {
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      return record;
    },
  },
})
export class PointsEntry {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  userId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  reason!: string;

  @ApiProperty({ description: 'Positive to award, negative to deduct' })
  @Prop({ required: true })
  points!: number;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'Donation' })
  donationId?: Types.ObjectId;

  @ApiProperty()
  awardedAt!: Date;
}

export const PointsEntrySchema = SchemaFactory.createForClass(PointsEntry);

// One award per user per donation per reason — makes awarding idempotent on retry.
PointsEntrySchema.index({ userId: 1, donationId: 1, reason: 1 }, { unique: true, sparse: true });
