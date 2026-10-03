import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsMongoId, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** FR12 */
export class CreateEnquiryDto {
  @ApiProperty({ minLength: 3 })
  @IsString()
  @MinLength(3)
  @MaxLength(120)
  subject!: string;

  @ApiProperty({ minLength: 10 })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  body!: string;

  @ApiPropertyOptional({ description: 'The donation this concern is about, if any' })
  @IsOptional()
  @IsMongoId()
  donationId?: string;
}

export class ResolveEnquiryDto {
  @ApiProperty({ minLength: 5 })
  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  resolution!: string;
}
