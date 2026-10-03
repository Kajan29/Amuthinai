import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { DonationStatus } from 'src/common/enums/donation-status.enum';
import { FoodType } from 'src/common/enums/food-type.enum';
import { Address, AddressSchema } from 'src/common/schemas/address.schema';

export type DonationDocument = HydratedDocument<Donation>;

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
export class Donation {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  donorId!: Types.ObjectId;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  title!: string;

  @ApiProperty({ enum: FoodType })
  @Prop({ type: String, enum: FoodType, required: true })
  foodType!: FoodType;

  @ApiProperty({ minimum: 1 })
  @Prop({ required: true, min: 1 })
  servings!: number;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ type: [String] })
  @Prop({ type: [String], default: [] })
  photoUrls!: string[];

  /** FR3 — declared by the donor. */
  @ApiProperty()
  @Prop({ required: true })
  cookedAt!: Date;

  @ApiProperty({ description: 'Hours the food stays safe after cookedAt' })
  @Prop({ required: true, min: 1 })
  safeForHours!: number;

  /** FR3 — derived from cookedAt + safeForHours; stored so it can be indexed and queried. */
  @ApiProperty()
  @Prop({ required: true, index: true })
  expiresAt!: Date;

  @ApiProperty({ type: Address })
  @Prop({ type: AddressSchema, required: true })
  pickupAddress!: Address;

  @ApiProperty({ enum: DonationStatus })
  @Prop({
    type: String,
    enum: DonationStatus,
    default: DonationStatus.PendingApproval,
    index: true,
  })
  status!: DonationStatus;

  /** FR4 — shown to the donor when an admin rejects the donation. */
  @ApiPropertyOptional()
  @Prop({ trim: true })
  rejectionReason?: string;

  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'User' })
  reviewedBy?: Types.ObjectId;

  @ApiPropertyOptional()
  @Prop()
  reviewedAt?: Date;

  // Maintained by `timestamps: true`; declared so they are typed and documented.
  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const DonationSchema = SchemaFactory.createForClass(Donation);

// The donor dashboard and admin queue both filter by status and sort by recency.
DonationSchema.index({ donorId: 1, createdAt: -1 });
DonationSchema.index({ status: 1, expiresAt: 1 });
DonationSchema.index({ 'pickupAddress.location': '2dsphere' });
