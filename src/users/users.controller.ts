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
} from '@nestjs/common';
import { UsersService } from './users.service';

import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';      
import { Roles } from '@/auth/decorators/auth.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateSubRoleIdDto } from '@/sub-roles/dto/update-sub-role-id.dto';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  //   @UseGuards(JwtAuthGuard, PermissionsGuard)
  //   @Permissions('MANAGE_USERS')
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
