import { LoggingService } from '@/log/logging.service';
import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, Injectable } from '@nestjs/common';
// import { CreateQuestionsDto } from './dto/cbt.dto';

@Injectable()
export class CbtService {
    constructor( 
        // private prisma: PrismaService,
        // private loggingService: LoggingService,
      ) {}

    // async createQuestionBank(createDto: CreateQuestionsDto, req: any) { // userId from auth
    //     const schoolId = req.user.schoolId; // Assuming schoolId is in the user object from the request
    //     const { subjectId, classId, questions } = createDto;
    
    //     // Check if set exists
    //     const existingSet = await this.prisma.question.findUnique({
    //       where: { school: { subjectId, classId } },
    //     });
    //     if (existingSet) {
    //       throw new BadRequestException('Question set already exists for this subject and class');
    //     }
    
    //     // Validate subjects/classes exist (add similar for class)
    //     const subject = await this.prisma.subject.findUnique({ where: { id: subjectId } });
    //     if (!subject) throw new BadRequestException('Subject not found');
    
    //     // Create set
    //     const questionSet = await this.prisma.questionSet.create({
    //       data: {
    //         subjectId,
    //         classId,
    //         createdBy: schoolId,
    //         updatedBy: schoolId,               
    //         school: {connect: schoolId}
    //       },
    //     });
    
    //     // Bulk create questions and options
    //     for (const q of questions) {
    //       const createdQuestion = await this.prisma.question.create({
    //         data: {
    //           text: q.questionText,
    //           questionSetId: questionSet.id,
    //         },
    //       });
    
    //       for (let i = 0; i < q.options.length; i++) {
    //         await this.prisma.option.create({
    //           data: {
    //             text: q.options[i].optionText,
    //             isCorrect: i === q.correctOptionIndex,
    //             questionId: createdQuestion.id,
    //           },
    //         });
    //       }
    //     }
    
    //     return { message: 'Questions created successfully', questionSetId: questionSet.id };
    //   }

    //   async edit(editDto: CreateQuestionsDto, userId: string) { // Reuse same DTO for simplicity
    //     const { subjectId, classId, questions } = editDto;
      
    //     const questionSet = await this.prisma.questionSet.findUnique({
    //       where: { subjectId_classId: { subjectId, classId } },
    //     });
    //     if (!questionSet) throw new BadRequestException('Question set not found');
      
    //     // Clear existing questions (cascades to options)
    //     await this.prisma.question.deleteMany({
    //       where: { questionSetId: questionSet.id },
    //     });
      
    //     // Recreate questions and options (same as create loop)
    //     for (const q of questions) {
    //       const createdQuestion = await this.prisma.question.create({
    //         data: {
    //           text: q.questionText,
    //           questionSetId: questionSet.id,
    //         },
    //       });
      
    //       for (let i = 0; i < q.options.length; i++) {
    //         await this.prisma.option.create({
    //           data: {
    //             text: q.options[i].optionText,
    //             isCorrect: i === q.correctOptionIndex,
    //             questionId: createdQuestion.id,
    //           },
    //         });
    //       }
    //     }
      
    //     // Update audit
    //     await this.prisma.questionSet.update({
    //       where: { id: questionSet.id },
    //       data: { updatedBy: userId },
    //     });
      
    //     return { message: 'Questions updated successfully', questionSetId: questionSet.id };
    //   }

    //   async delete(subjectId: string, classId: string, userId: string) {
    //     const questionSet = await this.prisma.questionSet.findUnique({
    //       where: { subjectId_classId: { subjectId, classId } },
    //     });
    //     if (!questionSet) throw new BadRequestException('Question set not found');
      
    //     // Optional: Check if userId matches createdBy for auth
      
    //     await this.prisma.questionSet.delete({
    //       where: { id: questionSet.id },
    //     }); // Cascades to questions/options
      
    //     return { message: 'Questions deleted successfully' };
    //   }


    //   async fetchAll(page: number = 1, limit: number = 10, search?: string) {
    //     const skip = (page - 1) * limit;
    //     const where = search ? { name: { contains: search, mode: 'insensitive' } } : {};
      
    //     const subjects = await this.prisma.subject.findMany({
    //       where: {
    //         ...where,
    //         questionSets: { some: {} }, // Only subjects with at least one set
    //       },
    //       select: {
    //         id: true,
    //         name: true, // Assuming Subject has 'name'
    //         questionSets: {
    //           select: {
    //             class: {
    //               select: { id: true, name: true }, // Assuming Class has 'name'
    //             },
    //           },
    //         },
    //       },
    //       skip,
    //       take: limit,
    //     });
      
    //     const total = await this.prisma.subject.count({
    //       where: {
    //         ...where,
    //         questionSets: { some: {} },
    //       },
    //     });
      
    //     return { subjects, total, page, limit };
    //   }


    //   async fetchClassesBySubject(subjectId: string) {
    //     const classes = await this.prisma.class.findMany({
    //       where: {
    //         questionSets: { some: { subjectId } },
    //       },
    //       select: { id: true, name: true },
    //     });
      
    //     return classes;
    //   }

    //   async fetchQuestions(subjectId: string, classId: string, schoolId?: string) {
    //     const whereSet = { subjectId, classId };
    //     if (schoolId) {
    //       whereSet['class'] = { schoolId }; // Assuming Class has schoolId
    //     }
      
    //     const questionSet = await this.prisma.questionSet.findUnique({
    //       where: { subjectId_classId: { subjectId, classId } },
    //       include: {
    //         questions: {
    //           include: {
    //             options: { select: { id: true, text: true, isCorrect: true } },
    //           },
    //         },
    //       },
    //     });
      
    //     if (!questionSet) throw new BadRequestException('No questions found');
      
    //     return questionSet.questions;
    //   }
}
