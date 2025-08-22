import { Body, Controller, Post } from '@nestjs/common';

@Controller('lesson-plan')
export class LessonPlanController {
    @Post("create")
    async createLessonplan(@Body() body: any){
        
    }
}
