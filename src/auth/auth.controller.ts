import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ForbiddenException, Req, Res, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateAuthDto } from './dto/create-auth.dto';
import { UpdateAuthDto } from './dto/update-auth.dto';
import { SchoolService } from 'src/school/school.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService
    private readonly schoolService: SchoolService
  ) {}

  @Post('create')
  create(@Body() createAuthDto: CreateAuthDto) {
    return this.authService.create(createAuthDto);
  }

  @Post('register')
  async register(@Body() dto: RegisterDto, @Res() res: Response) {
    const { user, token } = await this.authService.register(dto);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 1 day
    });

    res.cookie('actual_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('view_as', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('school_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, user: { id: user.id, email: user.email } });
  }

  @Post('login')
  async login(@Body() dto: LoginDto, @Res() res: Response) {
    const { user, token } = await this.authService.login(dto);

    res.cookie('xtk', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('actual_role', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('view_as', user.role, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('school_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.json({ success: true, user: { id: user.id, email: user.email } });
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req: Request) {
    const token = req.cookies['token'];
    const actualRole = req.cookies['actual_role'];
    const viewAs = req.cookies['view_as'];
    const schoolId = req.cookies['school_id'];

    const user = await this.authService.verifyToken(token);
    if (!user) throw new UnauthorizedException();

    return {
      id: user.id,
      email: user.email,
      actual_role: actualRole,
      view_as: viewAs,
      school_id: schoolId,
      permissions: user.permissions.map(p => p.name),
    };
  }

  @Post('switch-view')
  @UseGuards(JwtAuthGuard)
  async switchView(@Req() req: Request, @Res() res: Response, @Body() body: { schoolId: number }) {
    const actualRole = req.cookies['actual_role'];
    if (actualRole !== 'superAdmin') {
      throw new ForbiddenException('Not authorized');
    }

    const school = await this.schoolService.findById(body.schoolId);
    if (!school) throw new BadRequestException('Invalid school');

    res.cookie('view_as', 'admin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('school_id', body.schoolId.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.send({ success: true });
  }

  @Post('switch-back')
  @UseGuards(JwtAuthGuard)
  async switchBack(@Req() req: Request, @Res() res: Response) {
    const actualRole = req.cookies['actual_role'];
    if (actualRole !== 'superAdmin') {
      throw new ForbiddenException('Not authorized');
    }

    res.cookie('view_as', 'superAdmin', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    res.cookie('school_id', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000,
    });

    return res.send({ success: true });
  }


  @Get()
  findAll() {
    return this.authService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.authService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateAuthDto: UpdateAuthDto) {
    return this.authService.update(+id, updateAuthDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.authService.remove(+id);
  }
}
