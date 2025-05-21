import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PermissionsService } from './permissions.service';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { PermissionsGuard } from '@/auth/guards/permissions.guard';
import { Permissions } from '@/auth/decorators/permissions.decorator';
import { Roles } from '@/auth/decorators/auth.decorator';

@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Post()
  create(@Body() createPermissionDto: CreatePermissionDto, @Request() req) {
    return this.permissionsService.create(createPermissionDto, req);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get()
  findAll() {
    return this.permissionsService.findAll();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.permissionsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePermissionDto: UpdatePermissionDto,
    @Request() req,
  ) {
    return this.permissionsService.update(id, updatePermissionDto, req.user);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('superAdmin')
  @Delete(':id')
  remove(@Param('id') id: string, @Request() req) {
    return this.permissionsService.remove(id, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get('sub-role/:subRoleId')
  findBySubRoleId(@Param('subRoleId') subRoleId: string, @Request() req) {
    return this.permissionsService.findBySubRoleId(subRoleId, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:read')
  @Get('scope/school')
  findByScopeSchool() {
    return this.permissionsService.findByScopeSchool();
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('sub-role:update')
  @Patch('sub-role/:subRoleId')
  updateSubRolePermissions(
    @Param('subRoleId') subRoleId: string,
    @Body() body: { permissionIds: string[] },
    @Request() req,
  ) {
    return this.permissionsService.updateSubRolePermissions(
      subRoleId,
      body.permissionIds,
      req.user,
    );
  }
}
