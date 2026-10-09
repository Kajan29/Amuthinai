import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiHideProperty, ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { HydratedDocument } from 'mongoose';

import { Address, AddressSchema } from 'src/common/schemas/address.schema';
import { Role } from 'src/common/enums/role.enum';
import { VehicleType } from 'src/common/enums/vehicle-type.enum';

export type UserDocument = HydratedDocument<User>;

@Schema({
  timestamps: true,
  toJSON: {
    virtuals: true,
    versionKey: false,
    transform: (_doc, record: Record<string, unknown>) => {
      record.id = record._id;
      delete record._id;
      delete record.passwordHash;
      return record;
    },
  },
})
export class User {
  @ApiProperty()
  @Prop({ required: true, trim: true })
  name!: string;

  @ApiProperty()
  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  email!: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  phone?: string;

  @ApiHideProperty()
  @Prop({ select: false })
  passwordHash?: string;

  @ApiHideProperty()
  @Prop({ unique: true, sparse: true })
  googleId?: string;

  /** FR1 — unset until the user picks a role on the onboarding screen. */
  @ApiPropertyOptional({ enum: Role })
  @Prop({ type: String, enum: Role, index: true })
  role?: Role;

  @ApiProperty({ enum: ['en', 'ta', 'si'], default: 'en' })
  @Prop({ type: String, enum: ['en', 'ta', 'si'], default: 'en' })
  language!: 'en' | 'ta' | 'si';

  /** Volunteers need an admin to verify them before they receive offers. */
  @ApiProperty({ default: false })
  @Prop({ default: false, index: true })
  isVerified!: boolean;

  /** FR10 */
  @ApiProperty({ default: 0 })
  @Prop({ default: 0, min: 0 })
  karmaPoints!: number;

  /** FR7 — volunteers only. */
  @ApiPropertyOptional({ enum: VehicleType })
  @Prop({ type: String, enum: VehicleType })
  vehicleType?: VehicleType;

  @ApiPropertyOptional()
  @Prop({ min: 1, max: 50 })
  travelRadiusKm?: number;

  @ApiPropertyOptional({ type: Address })
  @Prop({ type: AddressSchema })
  address?: Address;

  /** Expo push token, refreshed on every launch (FR8). */
  @ApiHideProperty()
  @Prop({ select: false })
  pushToken?: string;

  /** OTP for email verification and password reset */
  @ApiHideProperty()
  @Prop({ select: false })
  otp?: string;

  @ApiHideProperty()
  @Prop({ select: false })
  otpExpiry?: Date;

  @ApiHideProperty()
  @Prop({ select: false })
  otpPurpose?: 'email-verification' | 'password-reset';

  @ApiPropertyOptional()
  @Prop({ default: false })
  isFlagged?: boolean;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  flagReason?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  nicNumber?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  drivingLicenseNumber?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  badgeTitle?: string;

  @ApiPropertyOptional()
  @Prop({ trim: true })
  avatarUrl?: string;

  @ApiPropertyOptional({ default: 0 })
  @Prop({ default: 0 })
  completedDeliveriesCount?: number;

  /** Email verification status */
  @ApiProperty({ default: false })
  @Prop({ default: false })
  emailVerified!: boolean;

  // Maintained by `timestamps: true`; declared so they are typed and documented.
  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Volunteer matching queries filter on role plus verification, then sort by distance (FR6).
UserSchema.index({ role: 1, isVerified: 1 });
UserSchema.index({ 'address.location': '2dsphere' });
