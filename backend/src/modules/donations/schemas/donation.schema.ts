import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import {
  DeliveryMethod,
  DietaryTag,
  HandlingInstruction,
  PickupSource,
  QuantityUnit,
} from 'src/common/enums/donation-details.enum';
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

  @ApiPropertyOptional({ enum: QuantityUnit })
  @Prop({ type: String, enum: QuantityUnit })
  quantityUnit?: QuantityUnit;

  @ApiPropertyOptional({ enum: DietaryTag, isArray: true })
  @Prop({ type: [String], enum: DietaryTag, default: [] })
  dietaryTags!: DietaryTag[];

  @ApiPropertyOptional()
  @Prop({ default: false })
  foodSafetyVerified!: boolean;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  description?: string;

  @ApiProperty({ type: [String] })
  @Prop({ type: [String], default: [] })
  photoUrls!: string[];

  @ApiPropertyOptional({ enum: PickupSource })
  @Prop({ type: String, enum: PickupSource })
  pickupSource?: PickupSource;

  /** FR3 — when a volunteer may start collecting. */
  @ApiPropertyOptional()
  @Prop()
  readyFrom?: Date;

  /** FR3 — last moment the food should be eaten. */
  @ApiPropertyOptional()
  @Prop()
  consumeBefore?: Date;

  @ApiPropertyOptional({ enum: HandlingInstruction, isArray: true })
  @Prop({ type: [String], enum: HandlingInstruction, default: [] })
  handling!: HandlingInstruction[];

  @ApiPropertyOptional({ enum: DeliveryMethod })
  @Prop({ type: String, enum: DeliveryMethod })
  deliveryMethod?: DeliveryMethod;

  @ApiPropertyOptional()
  @Prop({ trim: true, maxlength: 150 })
  handoverInstructions?: string;

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

  @ApiPropertyOptional()
  @Prop({ default: false })
  isFlagged?: boolean;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  flagReason?: string;

  @ApiPropertyOptional()
  @Prop()
  thermalTemp?: number;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  packagingType?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  pickupBay?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  contactPersonName?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  contactPersonPhone?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  urgentPrioritySector?: string;

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
