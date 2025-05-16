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
} from '@nestjs/common';
import { SubRolesService } from './sub-roles.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/auth.decorator';
import { CreateSubRoleDto } from './dto/create-sub-role.dto';
import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { AuthenticatedUser } from '@/types/express';
import { Request as RequestExpress } from 'express';
import { User } from '@prisma/client';


@Controller('sub-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superAdmin')
export class SubRolesController {
  constructor(private readonly subRolesService: SubRolesService) {}

  @Post()
  create(@Body() createSubRoleDto: CreateSubRoleDto, @Req() req: RequestExpress) {
        const user = req.user as AuthenticatedUser;
    
    return this.subRolesService.create(createSubRoleDto, user);
  }

  @Get(":/schoolId")
  findAll(@Param("schoolId") schoolId: "schoolId", @Req() req: RequestExpress) {
    const user = req.user as User;

    return this.subRolesService.findAll(schoolId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() req: RequestExpress) {
    const user = req.user as User;

    return this.subRolesService.findOne(id, user);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateSubRoleDto: UpdateSubRoleDto, @Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.subRolesService.update(id, updateSubRoleDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @Req() req: RequestExpress) {
    const user = req.user as AuthenticatedUser;
    return this.subRolesService.remove(id, user);
  }
}
