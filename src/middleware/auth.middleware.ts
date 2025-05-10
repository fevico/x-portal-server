import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../auth/auth.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  constructor(private authService: AuthService) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const token = req.cookies['xtk'];
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    const user = await this.authService.verifyToken(token);
    if (!user) {
      throw new UnauthorizedException('Invalid token');
    }

    req.user = user;
    next();
  }
}