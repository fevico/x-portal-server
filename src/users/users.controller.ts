import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Patch,
  Request,
  UseGuards,
  NotFoundException,
  Query,
  Delete,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Roles } from '@/auth/decorators/auth.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSubRoleIdDto } from '@/sub-roles/dto/update-sub-role-id.dto';
import { GetUsersQueryDto, UpdateUserDto } from './dto/user.dtos';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:create')
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Get(':email')
  async findByEmail(@Param('email') email: string) {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @UseGuards(JwtAuthGuard)
  @Get('id/:id')
  async findById(@Param('id') id: string) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:update')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req,
  ) {
    return this.usersService.update(id, updateUserDto, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:delete')
  @Delete(':id')
  async delete(@Param('id') id: string, @Request() req) {
    return this.usersService.delete(id, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('user:read', 'user:read:platform')
  @Get()
  async findAll(@Query() query: GetUsersQueryDto, @Request() req) {
    return this.usersService.findAll(query, req.user);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('MANAGE_SUBROLES')
  @Patch(':userId/sub-role')
  async updateSubRole(
    @Param('userId') userId: string,
    @Body() updateSubRoleDto: UpdateSubRoleIdDto,
    @Request() req,
  ) {
    return this.usersService.updateSubRole(
      userId,
      updateSubRoleDto.subRoleId,
      req.user,
    );
  }
}
