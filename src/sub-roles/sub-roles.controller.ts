import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { SubRolesService } from './sub-roles.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { CreateSubRoleDto } from './dto/create-sub-role.dto';
import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress } from 'express';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';

@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('sub-roles')
export class SubRolesController {
  constructor(private readonly subRolesService: SubRolesService) {}

  @Permissions('sub-role:create')
  @Post()
  create(
    @Body() createSubRoleDto: CreateSubRoleDto,
    @Req() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;

    return this.subRolesService.create(createSubRoleDto, user);
  }

  @Get()
  findAll(@Query('q') q: string, @Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;

    return this.subRolesService.findAll(q, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;

    return this.subRolesService.findOne(id, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateSubRoleDto: UpdateSubRoleDto,
    @Req() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.subRolesService.update(id, updateSubRoleDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.subRolesService.remove(id, user);
  }
}
