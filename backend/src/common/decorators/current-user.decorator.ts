import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

import type { Role } from '../enums/role.enum';

/** Shape the JWT strategy attaches to the request. */
export interface AuthUser {
  id: string;
  email: string;
  role: Role;
}

/**
 * Injects the authenticated user, or one of its fields:
 *
 *   @CurrentUser() user: AuthUser
 *   @CurrentUser('id') userId: string
 */
export const CurrentUser = createParamDecorator(
  (field: keyof AuthUser | undefined, context: ExecutionContext) => {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const user = request.user;

    if (!user) return undefined;
    return field ? user[field] : user;
  },
);
