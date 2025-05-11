import {
  Controller,
  // Get,
  // Post,
  // Body,
  // Patch,
  // Param,
  // Delete,
  UseGuards,
} from '@nestjs/common';
import { SubRolesService } from './sub-roles.service';
// import { CreateSubRoleDto } from './dto/create-sub-role.dto';
// import { UpdateSubRoleDto } from './dto/update-sub-role.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { RolesGuard } from '@/auth/guards/roles.guard';
import { Roles } from '@/auth/decorators/auth.decorator';

@Controller('sub-roles')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('superAdmin')
export class SubRolesController {
  constructor(private readonly subRolesService: SubRolesService) {}

  // @Post()
  // create(@Body() createSubRoleDto: CreateSubRoleDto) {
  //   return this.subRolesService.create(createSubRoleDto);
  // }

  // @Get()
  // findAll() {
  //   return this.subRolesService.findAll();
  // }

  // @Get(':id')
  // findOne(@Param('id') id: string) {
  //   return this.subRolesService.findOne(id);
  // }

  // @Patch(':id')
  // update(@Param('id') id: string, @Body() updateSubRoleDto: UpdateSubRoleDto) {
  //   return this.subRolesService.update(id, updateSubRoleDto);
  // }

  // @Delete(':id')
  // remove(@Param('id') id: string) {
  //   return this.subRolesService.remove(id);
  // }
}
