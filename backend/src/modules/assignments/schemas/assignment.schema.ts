import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { AssignmentStatus } from 'src/common/enums/assignment-status.enum';

export type AssignmentDocument = HydratedDocument<Assignment>;

/** FR6 — links one donation to one volunteer, and optionally to the request it fulfils. */
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
export class Assignment {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Donation', required: true })
  donationId!: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'FoodRequest' })
  requestId?: Types.ObjectId;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  volunteerId!: Types.ObjectId;

  @ApiProperty({ enum: AssignmentStatus })
  @Prop({
    type: String,
    enum: AssignmentStatus,
    default: AssignmentStatus.Offered,
    index: true,
  })
  status!: AssignmentStatus;

  /**
   * FR9 — hidden from the volunteer's payload; only the recipient can read it, and the
   * volunteer must type what the recipient tells them.
   */
  @ApiHideProperty()
  @Prop({ required: true, select: false })
  deliveryPin!: string;

  @ApiProperty({ description: 'Pickup distance from the volunteer at offer time' })
  @Prop({ required: true })
  distanceKm!: number;

  @ApiProperty()
  @Prop({ default: () => new Date() })
  offeredAt!: Date;

  @ApiPropertyOptional()
  @Prop()
  acceptedAt?: Date;

  @ApiPropertyOptional()
  @Prop()
  completedAt?: Date;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  declineReason?: string;
}

export const AssignmentSchema = SchemaFactory.createForClass(Assignment);

AssignmentSchema.index({ volunteerId: 1, status: 1 });
// At most one live assignment per donation.
AssignmentSchema.index(
  { donationId: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: [AssignmentStatus.Offered, AssignmentStatus.Accepted] },
    },
  },
);
