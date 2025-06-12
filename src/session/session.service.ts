import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/session.dto';
import { LoggingService } from '@/log/logging.service';
import { AuthenticatedUser } from '@/types/express';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async createSession(dto: CreateSessionDto, req: any) {
    const requester = req.user;

    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Validate session doesn't already exist
      const existingSession = await this.prisma.session.findFirst({
        where: {
          name: dto.session,
          schoolId: requester.schoolId,
          isDeleted: false,
        },
      });
      if (existingSession) {
        throw new BadRequestException('Session already exists for this school');
      }

      // Validate date ranges
      const dates = [
        {
          start: new Date(dto.firstTermStartDate),
          end: new Date(dto.firstTermEndDate),
        },
        {
          start: new Date(dto.secondTermStartDate),
          end: new Date(dto.secondTermEndDate),
        },
        {
          start: new Date(dto.thirdTermStartDate),
          end: new Date(dto.thirdTermEndDate),
        },
      ];

      for (let i = 0; i < dates.length; i++) {
        if (dates[i].start >= dates[i].end) {
          throw new BadRequestException(
            `Term ${i + 1} start date must be before end date`,
          );
        }
        if (i > 0 && dates[i].start <= dates[i - 1].end) {
          throw new BadRequestException(
            `Term ${i + 1} start date must be after Term ${i} end date`,
          );
        }
      }

      // Get current date (May 23, 2025)
      const currentDate = new Date();

      // Create session and terms in a transaction with increased timeout
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Create session
          const session = await tx.session.create({
            data: {
              name: dto.session,
              schoolId: requester.schoolId,
              createdBy: requester.id,
            },
          });

          // Create terms
          const terms = await Promise.all([
            tx.term.create({
              data: {
                name: 'First Term',
                startDate: new Date(dto.firstTermStartDate),
                endDate: new Date(dto.firstTermEndDate),
                sessionId: session.id,
                createdBy: requester.id,
              },
            }),
            tx.term.create({
              data: {
                name: 'Second Term',
                startDate: new Date(dto.secondTermStartDate),
                endDate: new Date(dto.secondTermEndDate),
                sessionId: session.id,
                createdBy: requester.id,
              },
            }),
            tx.term.create({
              data: {
                name: 'Third Term',
                startDate: new Date(dto.thirdTermStartDate),
                endDate: new Date(dto.thirdTermEndDate),
                sessionId: session.id,
                createdBy: requester.id,
              },
            }),
          ]);

          // Determine if this session should be the current session
          const sessionStart = new Date(dto.firstTermStartDate);
          const sessionEnd = new Date(dto.thirdTermEndDate);
          const isSessionActive =
            currentDate >= sessionStart && currentDate <= sessionEnd;

          let updateSchoolData: any = {};
          if (isSessionActive) {
            // Find the active term
            const activeTerm = terms.find(
              (term) =>
                currentDate >= new Date(term.startDate) &&
                currentDate <= new Date(term.endDate),
            );

            updateSchoolData = {
              currentSessionId: session.id,
              currentTermId: activeTerm?.id || null,
            };
          }

          // Update school with current session and term if applicable
          if (Object.keys(updateSchoolData).length > 0) {
            await tx.school.update({
              where: { id: requester.schoolId },
              data: updateSchoolData,
            });
          }

          return { session, terms, isSessionActive };
        },
        { timeout: 10000 }, // Increase timeout to 10 seconds
      );

      // Log action outside the transaction
      await this.loggingService.logAction(
        'create_session',
        'Session',
        result.session.id,
        requester.id,
        requester.schoolId,
        { name: result.session.name, terms: result.terms.map((t) => t.name) },
        req,
      );

      return {
        statusCode: 201,
        message: 'Session created successfully',
        data: {
          id: result.session.id,
          name: result.session.name,
          status: result.isSessionActive ? 'Active' : 'Inactive',
          terms: result.terms.map((term) => ({
            id: term.id,
            name: term.name,
            startDate: term.startDate.toISOString(),
            endDate: term.endDate.toISOString(),
            status:
              currentDate >= new Date(term.startDate) &&
              currentDate <= new Date(term.endDate)
                ? 'Active'
                : 'Inactive',
          })),
        },
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(
        'Failed to create session: ' + (error.message || 'Unknown error'),
      );
    }
  }

  // async getSessionsBySchool(req: any) {
  //   const requester = req.user;

  //   try {
  //     // Validate school
  //     const school = await this.prisma.school.findUnique({
  //       where: { id: requester.schoolId },
  //     });
  //     if (!school) {
  //       throw new NotFoundException('School not found');
  //     }

  //     // Fetch sessions with terms
  //     const sessions = await this.prisma.session.findMany({
  //       where: { schoolId: requester.schoolId, isDeleted: false },
  //       include: {
  //         school: { select: { name: true } },
  //         terms: {
  //           where: { isDeleted: false },
  //           orderBy: { startDate: 'asc' },
  //         },
  //         classArms: { include: { classArm: { select: { name: true } } } },
  //       },
  //       orderBy: { createdAt: 'desc' },
  //     });

  //     // Get current date (May 23, 2025)
  //     const currentDate = new Date();

  //     // Transform the data into the desired format
  //     const transformedSessions = [];
  //     for (const session of sessions) {
  //       const terms = session.terms;
  //       const sessionStart =
  //         terms.length > 0 ? new Date(terms[0].startDate) : null;
  //       const sessionEnd =
  //         terms.length > 0 ? new Date(terms[terms.length - 1].endDate) : null;
  //       const isSessionActive =
  //         sessionStart &&
  //         sessionEnd &&
  //         currentDate >= sessionStart &&
  //         currentDate <= sessionEnd;

  //       // Update school with current session and term if this session is active
  //       if (isSessionActive && school.currentSessionId !== session.id) {
  //         const activeTerm = terms.find(
  //           (term) =>
  //             currentDate >= new Date(term.startDate) &&
  //             currentDate <= new Date(term.endDate),
  //         );
  //         await this.prisma.school.update({
  //           where: { id: requester.schoolId },
  //           data: {
  //             currentSessionId: session.id,
  //             currentTermId: activeTerm?.id || null,
  //           },
  //         });
  //       }

  //       transformedSessions.push({
  //         id: session.id,
  //         name: session.name,
  //         status: isSessionActive ? 'Active' : 'Inactive',
  //         terms: terms.map((term) => ({
  //           id: term.id,
  //           name: term.name,
  //           startDate: term.startDate.toISOString(),
  //           endDate: term.endDate.toISOString(),
  //           status:
  //             currentDate >= new Date(term.startDate) &&
  //             currentDate <= new Date(term.endDate)
  //               ? 'Active'
  //               : 'Inactive',
  //         })),
  //       });
  //     }

  //     return transformedSessions;
  //   } catch (error) {
  //     console.error('Error fetching sessions:', error);
  //     throw new Error(
  //       'Failed to fetch sessions: ' + (error.message || 'Unknown error'),
  //     );
  //   }
  // }
  async getSessionsBySchool(req: any) {
    const requester = req.user;

    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Fetch sessions with terms and class-arm assignments
      const sessions = await this.prisma.session.findMany({
        where: { schoolId: requester.schoolId, isDeleted: false },
        include: {
          school: { select: { name: true } },
          terms: {
            where: { isDeleted: false },
            orderBy: { endDate: 'desc' },
          },
          classArmAssignments: {
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  classCategory: { select: { id: true, name: true } }, // Include classCategory name
                },
              },
              classArm: { select: { id: true, name: true } },
            },
            where: { isDeleted: false },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Get current date (02:16 AM WAT, May 24, 2025)
      const currentDate = new Date();

      // Transform the data into the desired format
      const transformedSessions = [];
      for (const session of sessions) {
        const terms = session.terms;
        const sessionStart =
          terms.length > 0 ? new Date(terms[0].startDate) : null;
        const sessionEnd =
          terms.length > 0 ? new Date(terms[terms.length - 1].endDate) : null;
        const isSessionActive =
          sessionStart &&
          sessionEnd &&
          currentDate >= sessionStart &&
          currentDate <= sessionEnd;

        // Update school with current session and term if this session is active
        if (isSessionActive && school.currentSessionId !== session.id) {
          const activeTerm = terms.find(
            (term) =>
              currentDate >= new Date(term.startDate) &&
              currentDate <= new Date(term.endDate),
          );
          await this.prisma.school.update({
            where: { id: requester.schoolId },
            data: {
              currentSessionId: session.id,
              currentTermId: activeTerm?.id || null,
            },
          });
        }

        // Fetch all classes for the school
        const allClasses = await this.prisma.class.findMany({
          where: { schoolId: requester.schoolId, isDeleted: false },
          include: { classCategory: { select: { name: true, id: true } } },
        });

        // Map class-arm assignments for this session
        const classArmAssignments = session.classArmAssignments.reduce(
          (acc, assignment) => {
            const classId = assignment.classId;
            if (!acc[classId]) acc[classId] = [];
            acc[classId].push({
              id: assignment.classArm.id,
              name: assignment.classArm.name,
            });
            return acc;
          },
          {} as Record<string, Array<{ id: string; name: string }>>,
        );

        transformedSessions.push({
          id: session.id,
          name: session.name,
          status: isSessionActive ? 'Active' : 'Inactive',
          terms: terms.map((term) => ({
            id: term.id,
            name: term.name,
            startDate: term.startDate.toISOString(),
            endDate: term.endDate.toISOString(),
            status:
              currentDate >= new Date(term.startDate) &&
              currentDate <= new Date(term.endDate)
                ? 'Active'
                : 'Inactive',
          })),
          classes: allClasses.map((cls) => ({
            id: cls.id,
            name: cls.name,
            category: cls.classCategory?.name,
            assignedArms: classArmAssignments[cls.id] || [],
          })),
        });
      }

      return transformedSessions;
    } catch (error) {
      console.error('Error fetching sessions:', error);
      throw new Error(
        'Failed to fetch sessions: ' + (error.message || 'Unknown error'),
      );
    }
  }
  async updateSession(id: string, dto: CreateSessionDto, req: any) {
    const requester = req.user;

    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
        select: { id: true, currentSessionId: true }, // Optimize by selecting only the id
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Validate session
      const session = await this.prisma.session.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        select: {
          id: true,
          name: true,
          terms: {
            where: { isDeleted: false },
            orderBy: { startDate: 'asc' },
            select: { id: true, startDate: true, endDate: true }, // Optimize by selecting only necessary fields
          },
        },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Validate session name doesn't conflict with another session
      const existingSession = await this.prisma.session.findFirst({
        where: {
          name: dto.session,
          schoolId: requester.schoolId,
          isDeleted: false,
          NOT: { id },
        },
        select: { id: true }, // Optimize by selecting only the id
      });
      if (existingSession) {
        throw new BadRequestException(
          'Session name already exists for this school',
        );
      }

      // Validate date ranges
      const dates = [
        {
          start: new Date(dto.firstTermStartDate),
          end: new Date(dto.firstTermEndDate),
        },
        {
          start: new Date(dto.secondTermStartDate),
          end: new Date(dto.secondTermEndDate),
        },
        {
          start: new Date(dto.thirdTermStartDate),
          end: new Date(dto.thirdTermEndDate),
        },
      ];

      for (let i = 0; i < dates.length; i++) {
        if (dates[i].start >= dates[i].end) {
          throw new BadRequestException(
            `Term ${i + 1} start date must be before end date`,
          );
        }
        if (i > 0 && dates[i].start <= dates[i - 1].end) {
          throw new BadRequestException(
            `Term ${i + 1} start date must be after Term ${i} end date`,
          );
        }
      }

      // Get current date (May 24, 2025, 12:57 AM WAT)
      const currentDate = new Date();

      // Update session and terms in a transaction with increased timeout
      await this.prisma.$transaction(
        async (tx) => {
          // Update session
          const updatedSession = await tx.session.update({
            where: { id },
            data: {
              name: dto.session,
              updatedBy: requester.id,
            },
            select: { id: true, name: true }, // Optimize by selecting only necessary fields
          });

          // Update terms (ensure exactly 3 terms exist)
          const terms = session.terms;
          if (terms.length !== 3) {
            throw new BadRequestException(
              'Session must have exactly three terms',
            );
          }

          const updatedTerms = await Promise.all([
            tx.term.update({
              where: { id: terms[0].id },
              data: {
                startDate: new Date(dto.firstTermStartDate),
                endDate: new Date(dto.firstTermEndDate),
                updatedBy: requester.id,
              },
              select: { id: true, name: true, startDate: true, endDate: true }, // Optimize selection
            }),
            tx.term.update({
              where: { id: terms[1].id },
              data: {
                startDate: new Date(dto.secondTermStartDate),
                endDate: new Date(dto.secondTermEndDate),
                updatedBy: requester.id,
              },
              select: { id: true, name: true, startDate: true, endDate: true }, // Optimize selection
            }),
            tx.term.update({
              where: { id: terms[2].id },
              data: {
                startDate: new Date(dto.thirdTermStartDate),
                endDate: new Date(dto.thirdTermEndDate),
                updatedBy: requester.id,
              },
              select: { id: true, name: true, startDate: true, endDate: true }, // Optimize selection
            }),
          ]);

          // Determine if this session should be the current session
          const sessionStart = new Date(dto.firstTermStartDate);
          const sessionEnd = new Date(dto.thirdTermEndDate);
          const isSessionActive =
            currentDate >= sessionStart && currentDate <= sessionEnd;

          let updateSchoolData: any = {};
          if (isSessionActive) {
            const activeTerm = updatedTerms.find(
              (term) =>
                currentDate >= new Date(term.startDate) &&
                currentDate <= new Date(term.endDate),
            );
            updateSchoolData = {
              currentSessionId: session.id,
              currentTermId: activeTerm?.id || null,
            };
          } else if (school.currentSessionId === session.id) {
            // If this session was the current session but is no longer active, clear it
            updateSchoolData = {
              currentSessionId: null,
              currentTermId: null,
            };
          }

          if (Object.keys(updateSchoolData).length > 0) {
            await tx.school.update({
              where: { id: requester.schoolId },
              data: updateSchoolData,
              select: { id: true }, // Optimize by selecting only the id
            });
          }

          // Log action
          await this.loggingService.logAction(
            'update_session',
            'Session',
            updatedSession.id,
            requester.id,
            requester.schoolId,
            { name: session.name, updatedName: dto.session },
            req,
          );

          return {
            statusCode: 200,
            message: 'Session updated successfully',
            data: {
              id: updatedSession.id,
              name: updatedSession.name,
              status: isSessionActive ? 'Active' : 'Inactive',
              terms: updatedTerms.map((term) => ({
                id: term.id,
                name: term.name,
                startDate: term.startDate.toISOString(),
                endDate: term.endDate.toISOString(),
                status:
                  currentDate >= new Date(term.startDate) &&
                  currentDate <= new Date(term.endDate)
                    ? 'Active'
                    : 'Inactive',
              })),
            },
          };
        },
        { timeout: 10000 },
      ); // Increase timeout to 10 seconds
    } catch (error) {
      console.error('Error updating session:', error);
      throw new Error(
        'Failed to update session: ' + (error.message || 'Unknown error'),
      );
    }
  }
  async deleteSession(id: string, req: any) {
    const requester = req.user;

    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Validate session
      const session = await this.prisma.session.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        include: { terms: { where: { isDeleted: false } } },
      });
      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Check for linked admissions
      const admissions = await this.prisma.admission.count({
        where: { sessionId: id, isDeleted: false },
      });
      if (admissions > 0) {
        throw new BadRequestException(
          'Cannot delete session with active admissions',
        );
      }

      // Delete session and terms in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Soft delete terms
        await tx.term.updateMany({
          where: { sessionId: id },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
          },
        });

        // Soft delete session
        await tx.session.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
          },
        });

        // If this was the current session, clear it
        if (school.currentSessionId === id) {
          await tx.school.update({
            where: { id: requester.schoolId },
            data: {
              currentSessionId: null,
              currentTermId: null,
            },
          });
        }

        // Log action
        await this.loggingService.logAction(
          'delete_session',
          'Session',
          id,
          requester.id,
          requester.schoolId,
          { name: session.name },
          req,
        );

        return { statusCode: 204, message: 'Session deleted successfully' };
      });

      return result;
    } catch (error) {
      console.error('Error deleting session:', error);
      throw new Error(
        'Failed to delete session: ' + (error.message || 'Unknown error'),
      );
    }
  }

  async getSessionClassArm(sessionId: string, user: AuthenticatedUser) {
    try {
      const schoolId = user.schoolId;
      const sessionData = await this.prisma.sessionClassClassArm.findMany({
        where: { sessionId, schoolId },
        include: { class: true, classArm: true },
      });

      if (!sessionData || sessionData.length === 0) {
        throw new NotFoundException('Session not found or no data available');
      }

      // Transform data into the desired format
      const formattedData = {
        classes: this.groupClassArmsByClass(sessionData),
      };

      return formattedData;
    } catch (error) {
      throw new HttpException(
        `Error fetching session with ID ${sessionId}: ${error.message}`,
        500,
      );
    }
  }

  private groupClassArmsByClass(
    sessionData: any[],
  ): { id: string; name: string; classArms: { id: string; name: string }[] }[] {
    const classMap = new Map<
      string,
      { id: string; name: string; classArms: { id: string; name: string }[] }
    >();

    sessionData.forEach((item) => {
      const classId = item.class.id;
      const className = item.class.name;

      if (!classMap.has(classId)) {
        classMap.set(classId, {
          id: classId,
          name: className,
          classArms: [],
        });
      }

      classMap.get(classId)?.classArms.push({
        id: item.classArm.id,
        name: item.classArm.name,
      });
    });

    return Array.from(classMap.values());
  }
}
