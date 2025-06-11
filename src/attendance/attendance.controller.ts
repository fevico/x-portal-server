import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import {
  AssignStudentToClassDto,
  GetStudentAttendanceDto,
  MarkStudentAttendanceDto,
  StudentPromotionDto,
} from './dto/attendance.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@Controller('attendance')
export class AttendanceController {
  constructor(private attendanceService: AttendanceService) {}

  @Get('students')
  @UseGuards(JwtAuthGuard)
  async getStudentAttendance(
    @Query() query: GetStudentAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.getStudentAttendance(query, req);
  }

  @Post('mark')
  @UseGuards(JwtAuthGuard)
  async markStudentAttendance(
    @Body() body: MarkStudentAttendanceDto,
    @Request() req,
  ) {
    return this.attendanceService.markStudentAttendance(body, req);
  }

  @Post('assign-student')
  @UseGuards(JwtAuthGuard)
  async assignStudentToClass(
    @Body() body: AssignStudentToClassDto,
    @Request() req,
  ) {
    return this.attendanceService.assignStudentToClass(body, req);
  }

  @Post('promote')
  @UseGuards(JwtAuthGuard)
  async studentPromotion(@Body() body: StudentPromotionDto, @Request() req) {
    return this.attendanceService.studentPromotion(body, req);
  }
}
