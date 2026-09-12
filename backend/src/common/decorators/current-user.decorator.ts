import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PublicAdmin } from '../types/public-admin';

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicAdmin => {
    const request = context.switchToHttp().getRequest<{ user: PublicAdmin }>();
    return request.user;
  },
);
