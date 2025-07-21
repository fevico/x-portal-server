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

  // @UseGuards(JwtAuthGuard, PermissionsGuard)
  // @Permissions('user:create')
  @Post()
  async create(@Body() createUserDto: CreateUserDto, @Request() req) {
    return this.usersService.create(createUserDto, req);
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

  // @UseGuards(JwtAuthGuard)
  // @Get('id/:id')
  // async findById(@Param('id') id: string) {
  //   const user = await this.usersService.findById(id);
  //   if (!user) {
  //     throw new NotFoundException('User not found');
  //   }
  //   return user;
  // }

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
  @Permissions('user:read')
  @Get('/get/all-users')
  async findAll(@Query() query: GetUsersQueryDto, @Request() req) {
    // console.log(query, req.user);
    return this.usersService.findAll(query, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('MANAGE_SUBROLES')
  /**
   * Create a new student (creates User first, then Student, links them)
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:create')
  @Post('student')
  async createStudent(@Body() body, @Request() req) {
    return this.usersService.createStudent(body, req.user);
  }

  /**
   * Edit student and linked user
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:update')
  @Patch('student/:studentId')
  async updateStudent(
    @Param('studentId') studentId: string,
    @Body() body,
    @Request() req,
  ) {
    return this.usersService.updateStudent(studentId, body, req.user);
  }

  /**
   * Soft delete student and linked user
   */
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('student:delete')
  @Delete('student/:studentId')
  async deleteStudent(@Param('studentId') studentId: string, @Request() req) {
    return this.usersService.deleteStudent(studentId, req.user);
  }
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

  @Get('student/:studentId')
  async getStudentById(@Param('studentId') studentId: string) {
    // Optionally, you can use req.user.schoolId for school-based filtering if needed
    return await this.usersService.getStudentById(studentId);
  }

  // --- Parent Endpoints ---
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:create')
  @Post('parent')
  async createParent(@Body() body, @Request() req) {
    return this.usersService.createParent(body, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:update')
  @Patch('parent/:parentId')
  async updateParent(
    @Param('parentId') parentId: string,
    @Body() body,
    @Request() req,
  ) {
    return this.usersService.updateParent(parentId, body, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:delete')
  @Delete('parent/:parentId')
  async deleteParent(@Param('parentId') parentId: string, @Request() req) {
    return this.usersService.deleteParent(parentId, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:read')
  @Get('parent/:parentId')
  async getParentById(@Param('parentId') parentId: string) {
    return this.usersService.getParentById(parentId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:read')
  @Get('/all/parent/all')
  async getAllParents(@Query() query, @Request() req) {
    return this.usersService.getAllParents(query, req.user);
  }

  // --- Staff/Teacher Endpoints ---
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('staff:create')
  @Post('staff')
  async createStaff(@Body() body, @Request() req) {
    return this.usersService.createStaff(body, req.user);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('staff:read')
  @Get('staff/all')
  async getAllStaff(@Query() query, @Request() req) {
    return this.usersService.getAllStaff(query, req.user);
  }
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('staff:update')
  @Patch('staff/:staffId')
  async updateStaff(
    @Param('staffId') staffId: string,
    @Body() body,
    @Request() req,
  ) {
    return this.usersService.updateStaff(staffId, body, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('staff:delete')
  @Delete('staff/:staffId')
  async deleteStaff(@Param('staffId') staffId: string, @Request() req) {
    return this.usersService.deleteStaff(staffId, req.user);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('staff:read')
  @Get('staff/:staffId')
  async getStaffById(@Param('staffId') staffId: string) {
    return this.usersService.getStaffById(staffId);
  }

  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @Permissions('parent:update')
  @Post('link-parent-student')
  async linkParentToStudent(@Body() body, @Request() req) {
    // body: { studentId, parentId, relationship }
    return this.usersService.linkParentToStudent(body, req.user);
  }
}
