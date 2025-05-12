import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import * as bcrypt from 'bcrypt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto, requester: User) {
    const { email, password, ...rest } = registerDto;
    const existingUser = await this.usersService.findByEmail(email);
    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await this.usersService.create(
      {
        ...rest,
        email,
        password: hashedPassword,
      },
      requester, // Replace 'requester' with the appropriate User object
    );

    return user;
  }

  async login(loginDto: LoginDto) {
    const { email, password } = loginDto;
    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.id, email: user.email };
    const token = this.jwtService.sign(payload, { expiresIn: '1d' });

    return { user, token };
  }

  async createViewAsToken(
    userId: string,
    viewAs: 'admin' | 'superAdmin',
    schoolId: string,
  ) {
    const user = await this.usersService.findById(userId);
    const payload = { sub: user.id, view_as: viewAs, schoolId };
    return this.jwtService.sign(payload, {
      secret: process.env.VIEW_AS_SECRET,
      expiresIn: '24h',
    });
  }
}
