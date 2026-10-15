import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument, Types } from 'mongoose';

import { RequestStatus } from 'src/common/enums/request-status.enum';
import { Address, AddressSchema } from 'src/common/schemas/address.schema';

export type FoodRequestDocument = HydratedDocument<FoodRequest>;

/** FR5 — a recipient's ask for food at a pinned location. */
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
export class FoodRequest {
  @ApiProperty()
  @Prop({ type: Types.ObjectId, ref: 'User', required: true, index: true })
  recipientId!: Types.ObjectId;

  @ApiProperty({ minimum: 1 })
  @Prop({ required: true, min: 1 })
  servingsNeeded!: number;

  @ApiProperty()
  @Prop({ required: true })
  neededBy!: Date;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  notes?: string;

  @ApiPropertyOptional({ description: 'Number of family members to feed' })
  @Prop({ min: 1 })
  familySize?: number;

  @ApiPropertyOptional({ type: [String] })
  @Prop({ type: [String], default: [] })
  dietaryRequirements!: string[];

  @ApiPropertyOptional({ description: 'Kind of food needed, e.g. cooked meals or dry rations' })
  @Prop({ trim: true })
  foodCategory?: string;

  @ApiPropertyOptional({ enum: ['call', 'sms', 'whatsapp', 'in_app'] })
  @Prop({ type: String, enum: ['call', 'sms', 'whatsapp', 'in_app'], default: 'call' })
  contactPreference!: 'call' | 'sms' | 'whatsapp' | 'in_app';

  @ApiPropertyOptional({ enum: ['doorstep', 'hub_pickup'] })
  @Prop({ type: String, enum: ['doorstep', 'hub_pickup'], default: 'doorstep' })
  deliveryMethod!: 'doorstep' | 'hub_pickup';

  @ApiPropertyOptional()
  @Prop({ trim: true })
  contactPhone?: string;

  @ApiPropertyOptional()
  @Prop()
  fulfilledAt?: Date;

  @ApiPropertyOptional()
  @Prop()
  cancelledAt?: Date;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: Address })
  @Prop({ type: AddressSchema, required: true })
  dropAddress!: Address;

  @ApiProperty({ enum: RequestStatus })
  @Prop({ type: String, enum: RequestStatus, default: RequestStatus.Open, index: true })
  status!: RequestStatus;

  /** Set when an admin matches this request to a donation (FR6). */
  @ApiPropertyOptional()
  @Prop({ type: Types.ObjectId, ref: 'Donation' })
  matchedDonationId?: Types.ObjectId;

  /**
   * `claim` requests exist only because the recipient claimed a general donation, so they are
   * cancelled (not reopened) if that donation falls through.
   */
  @ApiPropertyOptional({ enum: ['request', 'claim'] })
  @Prop({ type: String, enum: ['request', 'claim'], default: 'request' })
  origin!: 'request' | 'claim';
}

export const FoodRequestSchema = SchemaFactory.createForClass(FoodRequest);

FoodRequestSchema.index({ status: 1, neededBy: 1 });
FoodRequestSchema.index({ 'dropAddress.location': '2dsphere' });
