import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

import { PaginationQueryDto } from 'src/common/dto/pagination.dto';

export const ENQUIRY_CATEGORIES = [
  'late_delivery',
  'not_delivered',
  'food_quality',
  'wrong_quantity',
  'wrong_location',
  'volunteer_behaviour',
  'road_issue',
  'other',
] as const;

/** FR12 */
export class CreateEnquiryDto {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10, { message: 'Please describe the issue in at least 10 characters' })
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ enum: ENQUIRY_CATEGORIES })
  @IsOptional()
  @IsIn([...ENQUIRY_CATEGORIES])
  category?: (typeof ENQUIRY_CATEGORIES)[number];

  @ApiPropertyOptional({ description: 'The donation this concern is about, if any' })
  @IsOptional()
  @IsMongoId()
  donationId?: string;

  @ApiPropertyOptional({ description: 'The assignment/order this concern is about, if any' })
  @IsOptional()
  @IsMongoId()
  assignmentId?: string;

  @ApiPropertyOptional({ description: 'The food request this concern is about, if any' })
  @IsOptional()
  @IsMongoId()
  requestId?: string;
}

export class ResolveEnquiryDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  resolution!: string;
}

export class RespondEnquiryDto {
  @ApiProperty({ minLength: 2 })
  @IsString()
  @MinLength(2)
  @MaxLength(2000)
  message!: string;
}

export class QueryEnquiriesDto extends PaginationQueryDto {
  @ApiPropertyOptional({ enum: ['open', 'in_review', 'resolved'] })
  @IsOptional()
  @IsIn(['open', 'in_review', 'resolved'])
  status?: 'open' | 'in_review' | 'resolved';
}
