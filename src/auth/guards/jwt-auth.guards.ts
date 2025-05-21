import {
  Injectable,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any, context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse<Response>();

    // Clear cookies if authentication fails or view_as_token is invalid
    if (err || !user) {
      // Clear xtk cookie on authentication failure
      response.clearCookie('xtk', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
      });
      // Clear view_as_token if present
      if (request.cookies?.['view_as_token']) {
        response.clearCookie('view_as_token', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'none',
        });
      }
      throw err || new UnauthorizedException('Invalid or expired token');
    }

    // Clear view_as_token if verification failed
    if (request['clearViewAsToken']) {
      response.clearCookie('view_as_token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'none',
      });
    }

    return user;
  }
}
