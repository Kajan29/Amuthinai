import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { Role, SELF_SERVICE_ROLES } from 'src/common/enums/role.enum';

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

  @ApiProperty({ enum: SELF_SERVICE_ROLES, description: 'Admin accounts are provisioned, not registered' })
  @IsIn([...SELF_SERVICE_ROLES], { message: 'Choose donor, volunteer or recipient' })
  role!: Exclude<Role, Role.Admin>;
}
