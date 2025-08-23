import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { AuthenticatedUser } from '@/types/express';
import { Body, Controller, Post, Req, Request, UseGuards } from '@nestjs/common';
import { Request as RequestExpress } from 'express';
import { LessonPlanService } from './lesson-plan.service';
import { CreateLessonPlan } from './dto/less-plan.dto';


@Controller('lesson-plan')
export class LessonPlanController {
      constructor(private readonly lessonPLanService: LessonPlanService) {}
    
    @Post("create")
    @UseGuards(JwtAuthGuard)
    async createLessonplan(@Body() body: CreateLessonPlan, @Req() req: RequestExpress){
    const user = req.user as AuthenticatedUser;
    return this.lessonPLanService.createLessonPlan(body, user)
    }
}
