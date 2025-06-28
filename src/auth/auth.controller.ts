import {
  Controller,
  Post,
  Body,
  Res,
  UseGuards,
  Get,
  Request,
  NotFoundException,
  ForbiddenException,
  Patch,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Request as RequestExpress, Response } from 'express';
import { RolesGuard } from './guards/roles.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guards';
import { Roles } from './decorators/auth.decorator';
import { Permissions } from './decorators/permissions.decorator';
import { PermissionsGuard } from './guards/permissions.guard';
import { PrismaService } from '@/prisma/prisma.service';
import { AuthenticatedUser } from '@/types/express';
import { User } from '@prisma/client';
import { LoggingService } from '@/log/logging.service';
// import { SubRolesService } from '@/sub-roles/sub-roles.service';

@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private prisma: PrismaService,
    private loggingService: LoggingService,
    // private subRoleService: SubRolesService,
  ) {}

  @Post('login')
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: Response,
    @Request() req: RequestExpress,
  ): Promise<{ message: string; safeUser: User } | { error: string } | void> {
    const { user, token } = await this.authService.login(loginDto, req);

    res.cookie('xtk', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // fine for subdomain ↔ subdomain
      ...(process.env.NODE_ENV === 'production'
        ? { domain: '.bitekitchen.com.ng' }
        : {}),
      path: '/', // send on every request
      maxAge: 24 * 60 * 60 * 1000,
    });
    const safeUser = { ...user } as User;
    delete safeUser.password;
    return { message: 'Login successful', safeUser };
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req) {
    const safeUser = { ...req.user } as User;
    delete safeUser.password;
    console.log('User profile:', safeUser);
    return safeUser;
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

  @UseGuards(JwtAuthGuard)
  @Roles('superAdmin')
  @Patch('set-view-as')
  async setViewAs(
    @Req() req: RequestExpress,
    @Res({ passthrough: true }) res: Response,
    @Body()
    body: {
      view_as: 'admin' | 'superAdmin';
      schoolId: string;
      schoolSlug: string;
    },
  ) {
    const user = req.user as AuthenticatedUser;
    if (user.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can set view_as');
    }
    if (!['admin', 'superAdmin'].includes(body.view_as)) {
      throw new ForbiddenException('Invalid view_as value');
    }
    const viewAsToken = await this.authService.createViewAsToken(
      user.id,
      body.view_as,
      body.schoolId,
      body.schoolSlug,
    );
    res.cookie('view_as_token', viewAsToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // fine for subdomain ↔ subdomain
      ...(process.env.NODE_ENV === 'production'
        ? { domain: '.bitekitchen.com.ng' }
        : {}),
      path: '/', // send on every request
      maxAge: 24 * 60 * 60 * 1000,
    });
    return {
      view_as: body.view_as,
      schoolId: body.schoolId,
      schoolSlug: body.schoolSlug,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Request() req, @Res({ passthrough: true }) res: Response) {
    const user = req.user;
    // Log logout action
    await this.loggingService.logAction(
      'logout',
      'Auth',
      user.id,
      user.id,
      user.schoolId,
      { action: 'logout' },
    );

    // Clear cookies
    res.clearCookie('xtk', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });
    res.clearCookie('view_as_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return { message: 'Logged out successfully' };
  }
}
