import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { Role, SELF_SERVICE_ROLES } from 'src/common/enums/role.enum';

export class GoogleAuthDto {
  @ApiProperty({ description: 'Google ID token from the mobile app' })
  @IsString()
  @IsNotEmpty()
  idToken!: string;

  @ApiPropertyOptional({ description: 'Optional role for new users', enum: SELF_SERVICE_ROLES })
  @IsOptional()
  @IsIn([...SELF_SERVICE_ROLES])
  role?: Exclude<Role, Role.Admin>;
}
