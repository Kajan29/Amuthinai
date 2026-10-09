import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum } from 'class-validator';

import { Role } from 'src/common/enums/role.enum';

export class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  role!: Role;
}

export class SetActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}
