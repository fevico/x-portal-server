import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Get,
  Request,
  Param,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guards';
import { Roles } from './decorators/auth.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { SwitchSchoolDto } from './dto/switch-school.dto';
import { PrismaService } from '@/prisma/prisma.service';
// import { SubRolesService } from '@/sub-roles/sub-roles.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    // private subRoleService: SubRolesService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('register')
  async register(@Body() registerDto: RegisterDto, @Request() req) {
    return this.authService.register(registerDto, req.user);
  }

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { user, token } = await this.authService.login(loginDto);

    res.cookie('xtk', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });
    res.cookie('xtk_actual_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('xtk_view_as', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    if (user.role === 'admin' && user.schoolId) {
      res.cookie('xtk_sid', user.schoolId, {
        httpOnly: false, // Allow frontend access
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000,
      });
    }

    return { message: 'Login successful', user };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    return req.user;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Get('admin-only')
  adminOnly() {
    return { message: 'This is an admin-only route' };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('MANAGE_USERS')
  @Get('manage-users')
  manageUsers() {
    return { message: 'This route requires MANAGE_USERS permission' };
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('VIEW_REPORTS')
  @Get('school-info')
  async schoolInfo(@Request() req) {
    if (req.user.role === 'superAdmin') {
      const schools = await this.prisma.school.findMany({
        include: {
          users: { select: { id: true, firstname: true, lastname: true } },
          subRoles: { select: { id: true, name: true } },
        },
      });
      return { message: 'SuperAdmin view of all schools', schools };
    }

    if (!req.user.schoolId || !req.user.subRoleId) {
      throw new ForbiddenException(
        'User must be associated with a school and sub-role',
      );
    }

    const school = await this.prisma.school.findUnique({
      where: { id: req.user.schoolId },
      include: {
        users: { select: { id: true, firstname: true, lastname: true } },
        subRoles: { select: { id: true, name: true } },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    return { school };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Post('switch-school/:schoolId')
  async switchSchool(
    @Param() switchSchoolDto: SwitchSchoolDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const school = await this.prisma.school.findUnique({
      where: { id: switchSchoolDto.schoolId },
      include: {
        users: { select: { id: true, firstname: true, lastname: true } },
        subRoles: { select: { id: true, name: true } },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }

    res.cookie('view_as', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.cookie('schoolId', switchSchoolDto.schoolId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return { message: 'Switched to school', school };
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Post('switch-to-superadmin')
  async switchToSuperAdmin(@Res({ passthrough: true }) res: Response) {
    res.cookie('view_as', 'superAdmin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000,
    });
    res.clearCookie('schoolId');

    const schools = await this.prisma.school.findMany({
      include: {
        users: { select: { id: true, firstname: true, lastname: true } },
        subRoles: { select: { id: true, name: true } },
      },
    });

    return { message: 'Switched to superAdmin', schools };
  }
}
