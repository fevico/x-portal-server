// jwt.strategy.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { UsersService } from '@/users/users.service';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (request: Request) => {
          return request?.cookies?.['xtk'] || null;
        },
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET'),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: { sub: string; email: string; role: string },
  ) {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) return null;

    // Extract view_as from view_as_token
    let view_as: string | undefined;
    let view_as_schoolId: string | undefined;
    const viewAsToken = request?.cookies?.['view_as_token'];
    if (viewAsToken) {
      try {
        const viewAsPayload = this.jwtService.verify(viewAsToken, {
          secret: this.configService.get<string>('VIEW_AS_SECRET'),
        });
        // console.log(viewAsPayload);
        view_as = viewAsPayload.view_as;
        view_as_schoolId = viewAsPayload.schoolId;
      } catch (error) {
        // Invalid view_as_token, ignore
        // console.error('view_as_token verification error:', error);
      }
    }
    return {
      ...user,
      view_as: view_as || user.role,
      schoolId: view_as_schoolId || user.schoolId,
    } as AuthenticatedUser;
  }
}
