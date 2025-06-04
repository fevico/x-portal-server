import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { AssignStudentToClassDto, GetStudentAttendanceDto, MarkStudentAttendanceDto, StudentPromotionDto } from './dto/attendance.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@Controller('attendance')
export class AttendanceController {

    constructor(private attendanceService: AttendanceService){}

    @Get('students')
  @UseGuards(JwtAuthGuard)
  async getStudentAttendance(@Query() query: GetStudentAttendanceDto) {
    return this.attendanceService.getStudentAttendance(query);
  }

  @Post('mark')
  @UseGuards(JwtAuthGuard)
  async markStudentAttendance(@Body() body: MarkStudentAttendanceDto) {
    return this.attendanceService.markStudentAttendance(body);
  }

  @Post('assign-student')
  @UseGuards(JwtAuthGuard)
  async assignStudentToClass(@Body() body: AssignStudentToClassDto) {
    return this.attendanceService.assignStudentToClass(body);
  }

  @Post('promote')
  @UseGuards(JwtAuthGuard)
  async studentPromotion(@Body() body: StudentPromotionDto) {
    return this.attendanceService.studentPromotion(body);
  }
}
