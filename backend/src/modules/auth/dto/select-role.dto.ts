import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

import { Role, SELF_SERVICE_ROLES } from 'src/common/enums/role.enum';

/** FR1 — admin is deliberately excluded; admin accounts are provisioned, not self-selected. */
export class SelectRoleDto {
  @ApiProperty({ enum: SELF_SERVICE_ROLES })
  @IsIn([...SELF_SERVICE_ROLES])
  role!: Exclude<Role, Role.Admin>;
}
