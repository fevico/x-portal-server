import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Body, Controller, Get, Param, Post, Query, Req, Request, UseGuards } from '@nestjs/common';
import { Request as RequestExpress } from 'express';
import { LessonPlanService } from './lesson-plan.service';
import { CreateLessonPlan } from './dto/less-plan.dto';   

@Controller('lesson-plan')
export class LessonPlanController {
      constructor(private readonly lessonPlanService: LessonPlanService) {}
    
    @Post("create")
    @UseGuards(JwtAuthGuard)
    async createLessonplan(@Body() body: CreateLessonPlan, @Req() req: RequestExpress){
    const user = req.user as AuthenticatedUser;
    return this.lessonPlanService.createLessonPlan(body, user)
    }

    // @Get('')
    // @UseGuards(JwtAuthGuard)
    // async schoolLessonPlan(@Req() req: RequestExpress){
    //   const school = req.user as AuthenticatedUser
    //   return this.lessonPLanService.schoolLessonPlan(school)
    // }

    @Get('')
  async getSchoolLessonPlans(
    @Req() req: RequestExpress,
    @Query('subjectId') subjectId?: string,
    @Query('termId') termId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
  ) {
      const school = req.user as string
    return this.lessonPlanService.schoolLessonPlan(school, {
      subjectId,
      termId,
      sessionId,
      classId,
    });
  }

  // GET /lesson-plans/school123/lp1?sessionId=session101&termId=term789&subjectId=sub456&classId=class202
  @Get(':lessonPlanId')
  async getLessonPlanById(
    // @Param('schoolId') schoolId: string,
    @Req() req: RequestExpress,
    @Param('lessonPlanId') lessonPlanId: string,
    @Query('sessionId') sessionId?: string,
    @Query('termId') termId?: string,
    @Query('subjectId') subjectId?: string,
    @Query('classId') classId?: string,
  ) {
    const schoolId = req.user as string 
    return this.lessonPlanService.schoolLessonPlanById(schoolId, lessonPlanId, {
      sessionId,
      termId,
      subjectId,
      classId,
    });
  }


  @Get('/status/:status')
  async getLessonPlansByStatus(
    // @Param('schoolId') schoolId: string,
    @Req() req: RequestExpress,
    @Param('status') status: LessonPlanType,
    @Query('page') page: number = 1,
    @Query('termId') termId?: string,
    @Query('sessionId') sessionId?: string,
    @Query('classId') classId?: string,
    @Query('subjectId') subjectId?: string,
  ) {
    const schoolId = req.user as string 
    return this.lessonPlanService.schoolLessonPlanByStatus(schoolId, status, page, {
      termId,
      sessionId,
      classId,
      subjectId,
    });
  }
}
