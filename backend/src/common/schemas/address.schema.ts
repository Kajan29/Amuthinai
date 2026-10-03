import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';

/** GeoJSON point, indexed with 2dsphere wherever it is embedded. */
@Schema({ _id: false })
export class GeoPoint {
  @ApiProperty({ enum: ['Point'], default: 'Point' })
  @Prop({ type: String, enum: ['Point'], default: 'Point', required: true })
  type!: 'Point';

  @ApiProperty({ type: [Number], description: '[longitude, latitude]' })
  @Prop({ type: [Number], required: true })
  coordinates!: [number, number];
}

export const GeoPointSchema = SchemaFactory.createForClass(GeoPoint);

@Schema({ _id: false })
export class Address {
  @ApiProperty()
  @Prop({ required: true, trim: true })
  line1!: string;

  @ApiProperty()
  @Prop({ required: true, trim: true })
  city!: string;

  @ApiProperty({ required: false })
  @Prop({ trim: true })
  district?: string;

  @ApiProperty({ type: GeoPoint })
  @Prop({ type: GeoPointSchema, required: true })
  location!: GeoPoint;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
