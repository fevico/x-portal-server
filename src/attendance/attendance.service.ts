import { PrismaService } from '@/prisma/prisma.service';
import { BadRequestException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { AssignStudentToClassDto, GetStudentAttendanceDto, MarkStudentAttendanceDto, StudentPromotionDto } from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
    constructor( private prisma: PrismaService){}

    async getStudentInClassArm(sessionId: string, termId: string, classId: string, classArmId: string, schoolId: string) {
      try {
        // Validate session, class, and class arm
        const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
          where: { sessionId, classId, classArmId, schoolId },
        });
        if (!validAssignment) {
          throw new BadRequestException('Invalid class or class arm for session');
        }
    
        // Validate term belongs to session
        const validTerm = await this.prisma.term.findFirst({
          where: { id: termId, sessionId },
        });
        if (!validTerm) {
          throw new BadRequestException('Invalid term for session');
        }
    
        const students = await this.prisma.student.findMany({
          where: {
            classAssignments: {
              some: {
                sessionId,
                termId,
                classId,
                classArmId,
                schoolId,
                isActive: true,
              },
            },
          },
          include: {
            user: {
              select: { firstname: true, lastname: true, username: true, email: true },
            },
            class: { select: { name: true } },
            classArm: { select: { name: true } },
          },
        });
    
        if (!students || students.length === 0) {
          throw new BadRequestException('No students found for the given class and arm');
        }
    
        return students;
      } catch (error) {
        console.error(error);
        throw new HttpException('Internal server error', 500);
      }
    }

  //   async getStudentAttendance(query: any) {
  //       const { schoolId, sessionId, termId, classId, classArmId } = query;

  //   // Validate session, class, and class arm
  //   const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
  //     where: { sessionId, classId, classArmId, schoolId },
  //   });
  //   if (!validAssignment) {
  //     throw new BadRequestException('Invalid class or class arm for session');
  //   }

  //   // Validate term belongs to session
  //   const validTerm = await this.prisma.term.findFirst({
  //     where: { id: termId, sessionId },
  //   });
  //   if (!validTerm) {
  //     throw new BadRequestException('Invalid term for session');
  //   }

  //   // Fetch students using StudentClassAssignment
  //   const students = await this.prisma.student.findMany({
  //     where: {
  //       classAssignments: {
  //         some: {
  //           sessionId,
  //           termId,
  //           classId,
  //           classArmId,
  //           schoolId,
  //           isActive: true,
  //         },
  //       },
  //     },
  //     include: {
  //       user: {
  //         select: { firstname: true, lastname: true, username: true, email: true },
  //       },
  //       class: { select: { name: true } },
  //       classArm: { select: { name: true } },
  //     },
  //   });

  //   return students;
  // } catch (error) {
  //   console.error(error);
  //   throw new HttpException('Internal server error', 500);
  // }


// Assign a student to a class for a session/term
async getStudentAttendance(dto: GetStudentAttendanceDto) {
  try {
    const { schoolId, sessionId, termId, classId, classArmId } = dto;

    // Validate session, class, and class arm
    const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
      where: { sessionId, classId, classArmId, schoolId },
    });
    if (!validAssignment) {
      throw new BadRequestException('Invalid class or class arm for session');
    }

    // Validate term belongs to session
    const validTerm = await this.prisma.term.findFirst({
      where: { id: termId, sessionId },
    });
    if (!validTerm) {
      throw new BadRequestException('Invalid term for session');
    }

    const students = await this.prisma.student.findMany({
      where: {
        classAssignments: {
          some: {
            sessionId,
            termId,
            classId,
            classArmId,
            schoolId,
            isActive: true,
          },
        },
      },
      include: {
        user: {
          select: { firstname: true, lastname: true, username: true, email: true },
        },
        class: { select: { name: true } },
        classArm: { select: { name: true } },
      },
    });

    if (!students || students.length === 0) {
      throw new BadRequestException('No students found for the given class and arm');
    }

    return students;
  } catch (error) {
    console.error(error);
    throw new HttpException('Internal server error', 500);
  }
}

// async  assignStudentToClass({
//     studentId,
//     sessionId,
//     termId,
//     classId,
//     classArmId,
//     schoolId,
//     userId,
//   }) {
//     // Validate session, class, and class arm
//     const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
//       where: { sessionId, classId, classArmId, schoolId },
//     });
//     if (!validAssignment) throw new Error('Invalid class or class arm for session');
  
//     // Validate term belongs to session
//     const validTerm = await this.prisma.term.findFirst({
//       where: { id: termId, sessionId },
//     });
//     if (!validTerm) throw new Error('Invalid term for session');
  
//     // Deactivate existing assignment
//     await this.prisma.studentClassAssignment.updateMany({
//       where: { studentId, sessionId, termId, schoolId, isActive: true },
//       data: { isActive: false, updatedBy: userId },
//     });
  
//     // Create new assignment
//     const assignment = await this.prisma.studentClassAssignment.create({
//       data: {
//         studentId,
//         sessionId,
//         termId,
//         classId,
//         classArmId,
//         schoolId,
//         isActive: true,
//         createdBy: userId,
//       },
//     });
  
//     // Optionally update Student model
//     await this.prisma.student.update({
//       where: { id: studentId },
//       data: { classId, classArmId },
//     });
  
//     return assignment;
//   }

async assignStudentToClass(dto: AssignStudentToClassDto) {
  try {
    const { studentId, sessionId, termId, classId, classArmId, schoolId, userId } = dto;

    // Validate session, class, and class arm
    const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
      where: { sessionId, classId, classArmId, schoolId },
    });
    if (!validAssignment) {
      throw new BadRequestException('Invalid class or class arm for session');
    }

    // Validate term belongs to session
    const validTerm = await this.prisma.term.findFirst({
      where: { id: termId, sessionId },
    });
    if (!validTerm) {
      throw new BadRequestException('Invalid term for session');
    }

    // Validate student exists
    const student = await this.prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Perform operations in a transaction
    const assignment = await this.prisma.$transaction(async (tx) => {
      // Deactivate existing assignment
      await tx.studentClassAssignment.updateMany({
        where: { studentId, sessionId, termId, schoolId, isActive: true },
        data: { isActive: false, updatedBy: userId },
      });

      // Create new assignment
      const newAssignment = await tx.studentClassAssignment.create({
        data: {
          studentId,
          sessionId,
          termId,
          classId,
          classArmId,
          schoolId,
          isActive: true,
          createdBy: userId,
        },
      });

      // Update Student model
      await tx.student.update({
        where: { id: studentId },
        data: { classId, classArmId },
      });

      return newAssignment;
    });

    return assignment;
  } catch (error) {
    console.error(error);
    throw new HttpException('Internal server error', 500);
  }
}

  // async markStudentAttendance (body: any){
  //   const { schoolId, sessionId, termId, classId, classArmId, date, students, createdBy } = body;

  //   try {
  //         // Validate session, class, and class arm       
  //   const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
  //     where: { sessionId, classId, classArmId, schoolId },
  //   });
  //   if (!validAssignment) {
  //     throw new BadRequestException('Invalid class or class arm for session');
  //     // return res.status(400).json({ error: 'Invalid class or class arm for session' });
  //   }

  //   // Validate term belongs to session
  //   const validTerm = await this.prisma.term.findFirst({
  //     where: { id: termId, sessionId },
  //   });
  //   if (!validTerm) {
  //     // return res.status(400).json({ error: 'Invalid term for session' });
  //     throw new BadRequestException('Invalid term for session');
  //   }

  //   // Validate date is within term
  //   const parsedDate = new Date(date);
  //   if (parsedDate < validTerm.startDate || parsedDate > validTerm.endDate) {
  //     // return res.status(400).json({ error: 'Date is outside term range' });
  //     throw new BadRequestException('Date is outside term range');
  //   }

  //   // Validate students and their statuses
  //   const validStatuses = ['present', 'absent', 'late'];
  //   for (const student of students) {
  //     if (!student.studentId || !validStatuses.includes(student.attendanceStatus)) {
  //       // return res.status(400).json({ error: 'Invalid student ID or attendance status' });
  //       throw new BadRequestException('Invalid student ID or attendance status');
  //     }
  //   }

  //   // Check for existing attendance records to avoid duplicates
  //   const existingRecords = await this.prisma.attendance.findMany({
  //     where: {
  //       studentId: { in: students.map((s) => s.studentId) },
  //       date: parsedDate,
  //       schoolId,
  //       sessionId,
  //       termId,
  //     },
  //   });
  //   if (existingRecords.length > 0) {
  //     throw new BadRequestException('Attendance already recorded for some students on this date');
  //   }

  //   // Create attendance records
  //   await this.prisma.attendance.createMany({
  //     data: students.map((student) => ({
  //       studentId: student.studentId,
  //       schoolId,
  //       sessionId,
  //       termId,
  //       classId,
  //       classArmId,
  //       status: student.attendanceStatus,
  //       date: parsedDate,
  //       createdBy: createdBy || 'system',
  //     })),
  //   });
       
  //   // res.status(201).json({ message: 'Attendance recorded successfully' });
  //   return { message: 'Attendance recorded successfully' };
  //   } catch (error) {
  //     throw new HttpException("something went wrong", 500);
  //   }
  // }

  async markStudentAttendance(dto: MarkStudentAttendanceDto) {
    try {
      const { schoolId, sessionId, termId, classId, classArmId, date, students, createdBy } = dto;
  
      // Validate session, class, and class arm
      const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
        where: { sessionId, classId, classArmId, schoolId },
      });
      if (!validAssignment) {
        throw new BadRequestException('Invalid class or class arm for session');
      }
  
      // Validate term belongs to session
      const validTerm = await this.prisma.term.findFirst({
        where: { id: termId, sessionId },
      });
      if (!validTerm) {
        throw new BadRequestException('Invalid term for session');
      }
  
      // Validate date is within term
      const parsedDate = new Date(date);
      if (parsedDate < validTerm.startDate || parsedDate > validTerm.endDate) {
        throw new BadRequestException('Date is outside term range');
      }
  
      // Validate students and their statuses
      const validStatuses = ['present', 'absent', 'late'];
      for (const student of students) {
        if (!student.studentId || !validStatuses.includes(student.attendanceStatus)) {
          throw new BadRequestException('Invalid student ID or attendance status');
        }
        // Validate student exists
        const studentExists = await this.prisma.student.findUnique({ where: { id: student.studentId } });
        if (!studentExists) {
          throw new NotFoundException(`Student with ID ${student.studentId} not found`);
        }
      }
  
      // Check for existing attendance records
      const existingRecords = await this.prisma.attendance.findMany({
        where: {
          studentId: { in: students.map((s) => s.studentId) },
          date: parsedDate,
          schoolId,
          sessionId,
          termId,
        },
      });
      if (existingRecords.length > 0) {
        throw new BadRequestException('Attendance already recorded for some students on this date');
      }
  
      // Create attendance records
      await this.prisma.attendance.createMany({
        data: students.map((student) => ({
          studentId: student.studentId,
          schoolId,
          sessionId,
          termId,
          classId,
          classArmId,
          status: student.attendanceStatus,
          date: parsedDate,
          createdBy: createdBy || 'system',
        })),
      });
  
      return { message: 'Attendance recorded successfully' };
    } catch (error) {
      console.error(error);
      throw error instanceof HttpException ? error : new HttpException('Internal server error', 500);
    }
  }

  // async studentPromotion(body: any) {
  //   const { schoolId, sourceClassId, targetClassId, sessionId, termId, classArmId, createdBy } = body;
  //   try {
  //     //       // Validate session, target class, and class arm       
  //     const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
  //       where: { sessionId, classId: targetClassId, classArmId, schoolId },
  //     });
  //     if (!validAssignment) {
  //       // return res.status(400).json({ error: 'Invalid target class or class arm for session' });
  //       throw new BadRequestException('Invalid target class or class arm for session');
  //     }
  
  //     // Validate term belongs to session
  //     const validTerm = await this.prisma.term.findFirst({
  //       where: { id: termId, sessionId },
  //     });
  //     if (!validTerm) {
  //       // return res.status(400).json({ error: 'Invalid term for session' });
  //       throw new BadRequestException('Invalid term for session');
  //     }
  
  //     // Fetch students in the source class
  //     const students = await this.prisma.student.findMany({
  //       where: {
  //         classId: sourceClassId,
  //         user: { schoolId },
  //         admissionStatus: 'accepted', // Only promote active students
  //       },
  //     });
  
  //     if (students.length === 0) {
  //       // return res.status(404).json({ error: 'No students found in source class' });
  //       throw new NotFoundException('No students found in source class');
  //     }
  
  //     // Start a transaction to ensure atomicity
  //     await this.prisma.$transaction(async (tx) => {
  //       // Deactivate existing assignments for the new session/term
  //       await tx.studentClassAssignment.updateMany({
  //         where: {
  //           studentId: { in: students.map((s) => s.id) },
  //           sessionId,
  //           termId,
  //           schoolId,
  //           isActive: true,
  //         },
  //         data: { isActive: false, updatedBy: createdBy || 'system' },
  //       });
  
  //       // Create new StudentClassAssignment records
  //       await tx.studentClassAssignment.createMany({
  //         data: students.map((student) => ({
  //           studentId: student.id,
  //           sessionId,
  //           termId,
  //           classId: targetClassId,
  //           classArmId: classArmId || student.classArmId, // Keep same arm if not provided
  //           schoolId,
  //           isActive: true,
  //           createdBy: createdBy || 'system',
  //         })),
  //       });
  
  //       // Update Student model with new classId and classArmId
  //       await tx.student.updateMany({
  //         where: { id: { in: students.map((s) => s.id) } },
  //         data: {
  //           classId: targetClassId,
  //           classArmId: classArmId || { set: students.map((s) => s.classArmId) },
  //         },
  //       });
  //     });
  
  //     return { message: 'Students promoted successfully', promotedCount: students.length };
  //   } catch (error) {
  //     console.error(error);
  //     // res.status(500).json({ error: 'Internal server error' });
  //     throw new HttpException("something went wrong", 500);
  //   }
  // }

  async studentPromotion(dto: StudentPromotionDto) {
    try {
      const { schoolId, sourceClassId, targetClassId, sessionId, termId, classArmId, createdBy } = dto;
  
      // Validate source class
      const sourceClass = await this.prisma.class.findFirst({
        where: { id: sourceClassId, schoolId },
      });
      if (!sourceClass) {
        throw new BadRequestException('Invalid source class');
      }
  
      // Validate target class and class arm
      const validAssignment = await this.prisma.sessionClassClassArm.findFirst({
        where: { sessionId, classId: targetClassId, classArmId, schoolId },
      });
      if (!validAssignment) {
        throw new BadRequestException('Invalid target class or class arm for session');
      }
  
      // Validate term belongs to session
      const validTerm = await this.prisma.term.findFirst({
        where: { id: termId, sessionId },
      });
      if (!validTerm) {
        throw new BadRequestException('Invalid term for session');
      }
  
      // Fetch students in the source class
      const students = await this.prisma.student.findMany({
        where: {
          classId: sourceClassId,
          user: { schoolId },
          admissionStatus: 'accepted',
        },
      });
  
      if (students.length === 0) {
        throw new NotFoundException('No students found in source class');
      }
  
      // Start a transaction
      await this.prisma.$transaction(async (tx) => {
        // Deactivate existing assignments
        await tx.studentClassAssignment.updateMany({
          where: {
            studentId: { in: students.map((s) => s.id) },
            sessionId,
            termId,
            schoolId,
            isActive: true,
          },
          data: { isActive: false, updatedBy: createdBy || 'system' },
        });
  
        // Create new StudentClassAssignment records
        await tx.studentClassAssignment.createMany({
          data: students.map((student) => ({
            studentId: student.id,
            sessionId,
            termId,
            classId: targetClassId,
            classArmId: classArmId || student.classArmId,
            schoolId,
            isActive: true,
            createdBy: createdBy || 'system',
          })),
        });
  
        // Update Student model
        await tx.student.updateMany({
          where: { id: { in: students.map((s) => s.id) } },
          data: {
            classId: targetClassId,
            classArmId: classArmId,
          },
        });
      });
  
      return { message: 'Students promoted successfully', promotedCount: students.length };
    } catch (error) {
      console.error(error);
      throw error instanceof HttpException ? error : new HttpException('Internal server error', 500);
    }
  }


  }
