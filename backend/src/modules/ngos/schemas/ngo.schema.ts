import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

import { Address, AddressSchema } from 'src/common/schemas/address.schema';

export type NgoDocument = HydratedDocument<Ngo>;

/** FR11 — partner organisations that collect in bulk or vouch for recipients. */
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
export class Ngo {
  @ApiProperty()
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty()
  @Prop({ required: true, unique: true, trim: true })
  registrationNo!: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  contactPhone!: string;

  @ApiPropertyOptional()
  @Prop({ lowercase: true, trim: true })
  contactEmail?: string;

  @ApiProperty({ type: Address })
  @Prop({ type: AddressSchema, required: true })
  address!: Address;

  @ApiProperty({ default: true })
  @Prop({ default: true, index: true })
  isActive!: boolean;
}

export const NgoSchema = SchemaFactory.createForClass(Ngo);

NgoSchema.index({ 'address.location': '2dsphere' });
