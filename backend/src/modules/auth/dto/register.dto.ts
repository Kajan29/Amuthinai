import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from 'src/common/enums/role.enum';

/** FR1 */
export class RegisterDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  name!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty()
  @IsString()
  @MinLength(7)
  phone!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiPropertyOptional({ enum: ['en', 'ta', 'si'], default: 'en' })
  @IsOptional()
  @IsIn(['en', 'ta', 'si'])
  language: 'en' | 'ta' | 'si' = 'en';

  @ApiProperty({ enum: Role, description: 'User role' })
  @IsEnum(Role)
  role!: Role;
}
