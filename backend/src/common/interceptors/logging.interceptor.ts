import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import type { Request } from 'express';
import { type Observable, tap } from 'rxjs';

import type { AuthUser } from '../decorators/current-user.decorator';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const { method, url } = request;
    const actor = request.user ? `${request.user.role}:${request.user.id}` : 'anonymous';
    const startedAt = Date.now();

    return next
      .handle()
      .pipe(tap(() => this.logger.log(`${method} ${url} ${actor} ${Date.now() - startedAt}ms`)));
  }
}
