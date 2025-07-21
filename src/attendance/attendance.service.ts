import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignStudentToClassDto,
  GetStudentAttendanceDto,
  MarkStudentAttendanceDto,
  StudentPromotionDto,
} from './dto/attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(private prisma: PrismaService) {}

  async getStudentInClassArm(
    sessionId: string,
    termId: string,
    classId: string,
    classArmId: string,
    schoolId: string,
  ) {
    try {
      // Validate session, class, and class arm
      const validAssignment =
        await this.prisma.sessionClassAssignment.findFirst({
          where: { sessionId, classId, classArmId, schoolId },
        });
      if (!validAssignment) {
        throw new BadRequestException('Invalid class or class arm for session');
      }

      // Validate term belongs to session
      // const validTerm = await this.prisma.sessionTerm.findFirst({
      //   where: { id: termId, sessionId },
      // });
      // if (!validTerm) {
      //   throw new BadRequestException('Invalid term for session');
      // }

      const students = await this.prisma.student.findMany({
        where: {
          classAssignments: {
            some: {
              sessionId,
              classId,
              classArmId,
              schoolId,
              isActive: true,
            },
          },
        },
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              username: true,
              email: true,
            },
          },
          class: { select: { name: true } },
          classArm: { select: { name: true } },
        },
      });

      if (!students || students.length === 0) {
        throw new BadRequestException(
          'No students found for the given class and arm',
        );
      }

      return students;
    } catch (error) {
      console.error(error);
      throw new HttpException('Internal server error', 500);
    }
  }

  // Assign a student to a class for a session/term

  async getStudentAttendance(dto: GetStudentAttendanceDto, req: any) {
    const schoolId = req.user.schoolId; // Assuming schoolId is in the user object from the request
    try {
      const { sessionId, classId, classArmId } = dto;

      const validAssignment =
        await this.prisma.sessionClassAssignment.findFirst({
          where: { sessionId, classId, classArmId, schoolId },
        });
      if (!validAssignment) {
        throw new BadRequestException('Invalid class or class arm for session');
      }

      const students = await this.prisma.student.findMany({
        where: {
          classAssignments: {
            some: {
              sessionId,
              classId,
              classArmId,
              schoolId,
              isActive: true,
            },
          },
        },
        include: {
          user: {
            select: {
              firstname: true,
              lastname: true,
              username: true,
              email: true,
            },
          },
          class: { select: { name: true } },
          classArm: { select: { name: true } },
        },
      });

      if (!students || students.length === 0) {
        throw new BadRequestException(
          'No students found for the given class and arm',
        );
      }

      return students;
    } catch (error) {
      console.error(error);
      throw error instanceof HttpException
        ? error
        : new HttpException('Internal server error', 500);
    }
  }

  async assignStudentToClass(dto: AssignStudentToClassDto, req) {
    const schoolId = req.user.schoolId; // Assuming schoolId is in the user object from the request
    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }
    try {
      const { studentId, sessionId, termId, classId, classArmId } = dto;

      // Validate session, class, and class arm
      const validAssignment =
        await this.prisma.sessionClassAssignment.findFirst({
          where: { sessionId, classId, classArmId, schoolId },
        });
      if (!validAssignment) {
        throw new BadRequestException('Invalid class or class arm for session');
      }

      // Validate term belongs to session
      const validTerm = await this.prisma.sessionTerm.findFirst({
        where: { id: termId, sessionId },
      });
      if (!validTerm) {
        throw new BadRequestException('Invalid term for session');
      }

      // Validate student exists
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
      });
      if (!student) {
        throw new NotFoundException('Student not found');
      }

      // Perform operations in a transaction
      const assignment = await this.prisma.$transaction(async (tx) => {
        // Deactivate existing assignment
        await tx.studentClassAssignment.updateMany({
          where: { studentId, sessionId, schoolId, isActive: true },
          data: { isActive: false, updatedBy: req.user.id },
        });

        // Create new assignment
        const newAssignment = await tx.studentClassAssignment.create({
          data: {
            studentId,
            sessionId,
            classId,
            classArmId,
            schoolId,
            isActive: true,
            createdBy: req.user.id,
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

  async markStudentAttendance(dto: MarkStudentAttendanceDto, req) {
    const schoolId = req.user.schoolId; // Assuming schoolId is in the user object from the request
    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }
    try {
      const { sessionId, termId, classId, classArmId, date, students } = dto;

      // Validate session, class, and class arm
      const validAssignment =
        await this.prisma.sessionClassAssignment.findFirst({
          where: { sessionId, classId, classArmId, schoolId },
        });
      if (!validAssignment) {
        throw new BadRequestException('Invalid class or class arm for session');
      }

      // Validate term belongs to session
      const validTerm = await this.prisma.sessionTerm.findFirst({
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
        if (
          !student.studentId ||
          !validStatuses.includes(student.attendanceStatus)
        ) {
          throw new BadRequestException(
            'Invalid student ID or attendance status',
          );
        }
        // Validate student exists
        const studentExists = await this.prisma.student.findUnique({
          where: { id: student.studentId },
        });
        if (!studentExists) {
          throw new NotFoundException(
            `Student with ID ${student.studentId} not found`,
          );
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
        throw new BadRequestException(
          'Attendance already recorded for some students on this date',
        );
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
          createdBy: req.user.id || 'system',
        })),
      });

      return { message: 'Attendance recorded successfully' };
    } catch (error) {
      console.error(error);
      throw error instanceof HttpException
        ? error
        : new HttpException('Internal server error', 500);
    }
  }

  async studentPromotion(dto: StudentPromotionDto, req) {
    const schoolId = req.user.schoolId; // Assuming schoolId is in the user object from the request
    if (!schoolId) {
      throw new BadRequestException('School ID is required');
    }
    try {
      const { sourceClassId, targetClassId, sessionId, termId, classArmId } =
        dto;

      // Validate source class
      const sourceClass = await this.prisma.class.findFirst({
        where: { id: sourceClassId, schoolId },
      });
      if (!sourceClass) {
        throw new BadRequestException('Invalid source class');
      }

      // Validate target class and class arm
      const validAssignment =
        await this.prisma.sessionClassAssignment.findFirst({
          where: { sessionId, classId: targetClassId, classArmId, schoolId },
        });
      if (!validAssignment) {
        throw new BadRequestException(
          'Invalid target class or class arm for session',
        );
      }

      // Validate term belongs to session
      const validTerm = await this.prisma.sessionTerm.findFirst({
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
            schoolId,
            isActive: true,
          },
          data: { isActive: false, updatedBy: req.user.id || 'system' },
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
            createdBy: req.user.id || 'system',
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

      return {
        message: 'Students promoted successfully',
        promotedCount: students.length,
      };
    } catch (error) {
      console.error(error);
      throw error instanceof HttpException
        ? error
        : new HttpException('Internal server error', 500);
    }
  }

  async getAttendanceSummaryForMonth(
    sessionId: string,
    classId: string,
    classArmId: string,
    year: number,
    month: number,
    schoolId: string,
    termId?: string,
  ) {
    // Get all attendance records for the month/year/session/class/classArm
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59, 999); // Last day of month
    // Fetch attendance records
    const where: any = {
      schoolId,
      sessionId,
      classId,
      classArmId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    };
    if (termId) {
      where.termId = termId;
    }
    const records = await this.prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                othername: true,
                email: true,
                gender: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    // Group by day
    const daysInMonth = new Date(year, month, 0).getDate();
    const summary = {};
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = new Date(year, month - 1, day).toISOString().slice(0, 10);
      summary[dateStr] = {
        present: 0,
        absent: 0,
        late: 0,
        students: {
          present: [],
          absent: [],
          late: [],
        },
      };
    }
    for (const record of records) {
      const dateStr = record.date.toISOString().slice(0, 10);
      if (!summary[dateStr]) continue;
      summary[dateStr][record.status]++;
      summary[dateStr].students[record.status].push({
        id: record.student.id,
        regNo: record.student.studentRegNo,
        fullName:
          `${record.student.user.lastname || ''} ${record.student.user.firstname || ''} ${record.student.user.othername || ''}`.trim(),
        email: record.student.user.email,
        gender: record.student.user.gender,
        avatar: record.student.user.avatar,
      });
    }
    // Convert summary to array for calendar
    const result = Object.entries(summary).map(([date, data]) => {
      const dayData = data as {
        present: number;
        absent: number;
        late: number;
        students: {
          present: any[];
          absent: any[];
          late: any[];
        };
      };
      return {
        date,
        present: dayData.present,
        absent: dayData.absent,
        late: dayData.late,
        students: dayData.students,
      };
    });
    return result;
  }

  private async getSessionYearsAndMonthsInternal(
    sessionId: string,
    schoolId: string,
  ) {
    const terms = await this.prisma.sessionTerm.findMany({
      where: { sessionId, schoolId },
      select: { startDate: true, endDate: true },
    });
    if (!terms.length) return { yearMonths: {}, minDate: null, maxDate: null };
    let minDate = terms[0].startDate;
    let maxDate = terms[0].endDate;
    for (const t of terms) {
      if (t.startDate < minDate) minDate = t.startDate;
      if (t.endDate > maxDate) maxDate = t.endDate;
    }
    const yearMonths: Record<number, number[]> = {};
    const d = new Date(minDate);
    while (d <= maxDate) {
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      if (!yearMonths[year]) yearMonths[year] = [];
      if (!yearMonths[year].includes(month)) yearMonths[year].push(month);
      d.setMonth(d.getMonth() + 1);
    }
    return { yearMonths, minDate, maxDate };
  }

  async getAttendanceSummaryCombined(
    sessionId: string,
    classId: string,
    classArmId: string,
    year?: number,
    month?: number,
    schoolId?: string,
    termId?: string,
  ) {
    // Get available year/months
    const { yearMonths, minDate, maxDate } =
      await this.getSessionYearsAndMonthsInternal(sessionId, schoolId);
    // Determine default year/month
    const now = new Date();
    let targetYear = year;
    let targetMonth = month;
    if (!year || !month) {
      if (now >= minDate && now <= maxDate) {
        targetYear = now.getFullYear();
        targetMonth = now.getMonth() + 1;
      } else {
        targetYear = minDate.getFullYear();
        targetMonth = minDate.getMonth() + 1;
      }
    }
    // Get attendance summary for target year/month or term
    let summary;
    if (termId) {
      summary = await this.getAttendanceSummaryForTerm(
        sessionId,
        classId,
        classArmId,
        termId,
        schoolId,
      );
    } else {
      summary = await this.getAttendanceSummaryForMonth(
        sessionId,
        classId,
        classArmId,
        targetYear,
        targetMonth,
        schoolId,
        termId,
      );
    }
    return {
      yearMonths,
      selectedYear: targetYear,
      selectedMonth: targetMonth,
      summary,
    };
  }

  async getAttendanceSummaryForTerm(
    sessionId: string,
    classId: string,
    classArmId: string,
    termId: string,
    schoolId: string,
  ) {
    // Get term start/end
    const term = await this.prisma.sessionTerm.findFirst({
      where: { id: termId, sessionId, schoolId },
      select: { startDate: true, endDate: true },
    });
    if (!term) return [];
    const startDate = term.startDate;
    const endDate = term.endDate;
    // Fetch attendance records for the term
    const records = await this.prisma.attendance.findMany({
      where: {
        schoolId,
        sessionId,
        classId,
        classArmId,
        termId,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        student: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                othername: true,
                email: true,
                gender: true,
                avatar: true,
              },
            },
          },
        },
      },
    });
    // Group by day
    const summary: Record<string, any> = {};
    for (
      let d = new Date(startDate);
      d <= endDate;
      d.setDate(d.getDate() + 1)
    ) {
      const dateStr = d.toISOString().slice(0, 10);
      summary[dateStr] = {
        present: 0,
        absent: 0,
        late: 0,
        students: {
          present: [],
          absent: [],
          late: [],
        },
      };
    }
    for (const record of records) {
      const dateStr = record.date.toISOString().slice(0, 10);
      if (!summary[dateStr]) continue;
      summary[dateStr][record.status]++;
      summary[dateStr].students[record.status].push({
        id: record.student.id,
        regNo: record.student.studentRegNo,
        fullName:
          `${record.student.user.lastname || ''} ${record.student.user.firstname || ''} ${record.student.user.othername || ''}`.trim(),
        email: record.student.user.email,
        gender: record.student.user.gender,
        avatar: record.student.user.avatar,
      });
    }
    // Convert summary to array for calendar
    const result = Object.entries(summary).map(([date, data]) => {
      const dayData = data as {
        present: number;
        absent: number;
        late: number;
        students: {
          present: any[];
          absent: any[];
          late: any[];
        };
      };
      return {
        date,
        present: dayData.present,
        absent: dayData.absent,
        late: dayData.late,
        students: dayData.students,
      };
    });
    return result;
  }
}
