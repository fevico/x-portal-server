import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { LoggingService } from '@/log/logging.service';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private loggingService: LoggingService,
  ) {}

  async login(loginDto: LoginDto, req) {
    const { email, username, password } = loginDto;
    const identifier = email || username; // Use provided email or username
    const user = await this.usersService.findByUsernameOrEmail(identifier);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }
    // Log login
    await this.loggingService.logAction(
      'login',
      'Auth',
      user.id,
      user.id,
      user.schoolId,
      { email },
      req,
    );

    const payload = {
      sub: user.id,
      permissions: user.permissions,
      role: user.role,
    };
    const token = this.jwtService.sign(payload);

    return { user, token };
  }

  async createViewAsToken(
    userId: string,
    viewAs: 'admin' | 'superAdmin',
    schoolId: string,
    schoolSlug: string,
  ) {
    const user = await this.usersService.findById(userId);
    // console.log(user);
    const payload = { sub: user.id, view_as: viewAs, schoolId, schoolSlug };
    return this.jwtService.sign(payload, {
      secret: process.env.VIEW_AS_SECRET,
      expiresIn: '24h',
    });
  }
}
