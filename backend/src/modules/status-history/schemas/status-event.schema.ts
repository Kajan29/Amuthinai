import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { Role } from 'src/common/enums/role.enum';

export type StatusEventDocument = HydratedDocument<StatusEvent>;

/**
 * FR12 / NFR7 — one append-only entry per status change. `prevHash` and `hash` form a chain
 * per donation: editing or deleting any entry breaks every hash after it, which makes
 * tampering detectable without a separate audit store.
 */
@Schema({
  timestamps: { createdAt: true, updatedAt: false },
  toJSON: {
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      return record;
    },
  },
})
export class StatusEvent {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Donation', required: true, index: true })
  donationId!: Types.ObjectId;

  @ApiProperty({ enum: DonationStatus })
  @Prop({ type: String, enum: DonationStatus, required: true })
  status!: DonationStatus;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  note?: string;

  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  actorId!: Types.ObjectId;

  @ApiProperty({ enum: Role })
  @Prop({ type: String, enum: Role, required: true })
  actorRole!: Role;

  @ApiProperty()
  @Prop({ required: true, default: () => new Date() })
  occurredAt!: Date;

  @ApiProperty({ description: 'Hash of the preceding entry, or the genesis marker' })
  @Prop({ required: true })
  prevHash!: string;

  @ApiProperty({ description: 'SHA-256 over this entry plus prevHash' })
  @Prop({ required: true })
  hash!: string;
}

export const StatusEventSchema = SchemaFactory.createForClass(StatusEvent);

StatusEventSchema.index({ donationId: 1, occurredAt: 1 });

// The log is append-only: block updates and deletes at the model layer so a bug elsewhere
// cannot quietly rewrite history.
const BLOCKED = ['updateOne', 'updateMany', 'findOneAndUpdate', 'deleteOne', 'deleteMany'] as const;
for (const operation of BLOCKED) {
  StatusEventSchema.pre(operation, function blockMutation(next) {
    next(new Error('status history is append-only'));
  });
}
