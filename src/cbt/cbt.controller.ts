import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { CbtService } from './cbt.service';
import { CreateQuestionsDto } from './dto/cbt.dto';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';

@Controller('cbt')
export class CbtController {
      constructor(private readonly CbtService: CbtService) {}

    @Post('')
    @UseGuards(JwtAuthGuard)
    async addQuestions(@Body() addQuestionDto: CreateQuestionsDto, @Request() req){
        return this.CbtService.createQuestionBank(addQuestionDto, req)
    }       


}   
