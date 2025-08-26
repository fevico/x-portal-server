import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Body, Controller, Get, Param, Patch, Post, Query, Req, Request, UseGuards } from '@nestjs/common';
import { Request as RequestExpress } from 'express';
import { LessonPlanService } from './lesson-plan.service';
import { CreateLessonPlan } from './dto/less-plan.dto';   
import { LessonPlanType } from '@prisma/client';

@Controller('lesson-plan')
export class LessonPlanController {
      constructor(private readonly lessonPlanService: LessonPlanService) {}
    
    @Post("create")
    @UseGuards(JwtAuthGuard)
    async createLessonplan(@Body() body: CreateLessonPlan, @Req() req: RequestExpress){
    const user = req.user as AuthenticatedUser;
    return this.lessonPlanService.createLessonPlan(body, user)
    }

 @Get('')
  async getSchoolLessonPlans(
  @Req() req: RequestExpress,
  @Query('page') page: string = '1',
  @Query('limit') limit: string = '10',
  @Query('subjectId') subjectId?: string,
  @Query('termId') termId?: string,
  @Query('sessionId') sessionId?: string,
  @Query('classId') classId?: string,
  @Query('status') status?: LessonPlanType,
) {
  const user = req.user as AuthenticatedUser;

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.max(1, Math.min(100, parseInt(limit, 10) || 10)); // Limit max to 100
  const skip = (pageNum - 1) * limitNum;

  return this.lessonPlanService.schoolLessonPlan(user.schoolId, {
    subjectId,
    termId,
    sessionId,
    classId,
    status,
    pageNum,
    limitNum,
    skip,
  });
}

  // GET /lesson-plans/school123/lp1?sessionId=session101&termId=term789&subjectId=sub456&classId=class202
  @Get(':lessonPlanId')
  async getLessonPlanById(
    // @Param('schoolId') schoolId: string,
    @Req() req: RequestExpress,
    @Param('lessonPlanId') lessonPlanId: string,
  ) {
    const user = req.user as AuthenticatedUser 
    return this.lessonPlanService.schoolLessonPlanById(user.schoolId, lessonPlanId);
  }

  @Patch('status/:lessonPlan')
  @UseGuards(JwtAuthGuard)
  async updateLessonPlan(@Param("lessonPlan") lessonPlan: string, @Req() req: RequestExpress, @Body("status") status: LessonPlanType){
    const user = req.user as AuthenticatedUser
    return this.lessonPlanService.updateLessonPlanStatus(user.schoolId, lessonPlan, status)
  }

  @Get('weeks/:sessionId/:termId')
  @UseGuards(JwtAuthGuard)
  async fetchSessionTermWeeks(@Req() req: RequestExpress, @Param("sessionId") sessionId: string, @Param("termId") termId: string){
    const school = req.user as AuthenticatedUser
    return this.lessonPlanService.fetchSessionTermWeeks(school.schoolId, sessionId, termId)
  }
}
