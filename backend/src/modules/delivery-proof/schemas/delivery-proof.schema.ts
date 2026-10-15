import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { GeoPoint, GeoPointSchema } from 'src/common/schemas/address.schema';

export type DeliveryProofDocument = HydratedDocument<DeliveryProof>;

export type ProofStage = 'pickup' | 'delivery';

/** FR9 — photo plus server timestamp plus device location for one leg of the journey. */
@Schema({
  timestamps: { createdAt: 'capturedAt', updatedAt: false },
  toJSON: {
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      return record;
    },
  },
})
export class DeliveryProof {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'Assignment', required: true, index: true })
  assignmentId!: Types.ObjectId;

  @ApiProperty({ enum: ['pickup', 'delivery'] })
  @Prop({ type: String, enum: ['pickup', 'delivery'], required: true })
  stage!: ProofStage;

  /** Required for volunteer legs; optional for an in-person donor/recipient handover. */
  @ApiProperty({ required: false })
  @Prop()
  photoUrl?: string;

  @ApiProperty({ type: GeoPoint, required: false, description: 'Where the device was at capture' })
  @Prop({ type: GeoPointSchema })
  location?: GeoPoint;

  @ApiProperty({ enum: ['volunteer', 'donor', 'admin'], required: false })
  @Prop({ type: String, enum: ['volunteer', 'donor', 'admin'], default: 'volunteer' })
  recordedBy?: 'volunteer' | 'donor' | 'admin';

  /** FR9 — true only when the recipient's PIN matched at delivery. */
  @ApiProperty({ default: false })
  @Prop({ default: false })
  pinVerified!: boolean;

  @ApiProperty({ required: false })
  @Prop({ min: 0 })
  quantityConfirmed?: number;

  @ApiProperty({ required: false })
  @Prop({ trim: true })
  note?: string;

  @ApiProperty()
  capturedAt!: Date;
}

export const DeliveryProofSchema = SchemaFactory.createForClass(DeliveryProof);

// One proof per stage per assignment.
DeliveryProofSchema.index({ assignmentId: 1, stage: 1 }, { unique: true });
