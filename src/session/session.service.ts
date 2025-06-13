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
import { TermEnum } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    name: 'checkActiveAndInactiveSession',
    timeZone: 'Africa/Lagos',
  })
  async handleActiveAndInActiveSession() {
    const currentDate = new Date();
  
    // Get all session terms that are not deleted
    const sessionTerms = await this.prisma.sessionTerm.findMany({
      where: {
        isDeleted: false,
        school: { isDeleted: false },
      },
      include: {
        session: true,
      },
    });
  
    for (const term of sessionTerms) {
      const isCurrentlyActive =
        term.startDate <= currentDate && term.endDate >= currentDate;
  
      const isExpired = term.endDate < currentDate;
  
      if (isCurrentlyActive) {
        // Deactivate all other terms and sessions for this school
        await this.prisma.sessionTerm.updateMany({
          where: {
            schoolId: term.schoolId,
            id: { not: term.id },
          },
          data: {
            isActive: false,
          },
        });
  
        await this.prisma.session.updateMany({
          where: {
            schoolId: term.schoolId,
            id: { not: term.sessionId },
          },
          data: {
            isActive: false,
          },
        });
  
        // Activate this term and session
        await this.prisma.sessionTerm.update({
          where: { id: term.id },
          data: {
            isActive: true,
          },
        });
  
        await this.prisma.session.update({
          where: { id: term.sessionId },
          data: {
            isActive: true,
          },
        });
  
      } else if (isExpired) {
        // Mark expired term as inactive
        await this.prisma.sessionTerm.update({
          where: { id: term.id },
          data: {
            isActive: false,
          },
        });
  
        // Optionally also deactivate the session if all its terms are expired
        const activeTerms = await this.prisma.sessionTerm.findMany({
          where: {
            sessionId: term.sessionId,
            isActive: true,
          },
        });    
  
        if (activeTerms.length === 0) {
          await this.prisma.session.update({
            where: { id: term.sessionId },
            data: {               
              isActive: false,
            },
          });
        }
      }
    }
  
    // this.logger.log('Session and term activation/inactivation check completed.');
  }
  

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
        if (isNaN(dates[i].start.getTime()) || isNaN(dates[i].end.getTime())) {
          throw new BadRequestException(
            `Term ${i + 1} has invalid date format`,
          );
        }
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

      // Fetch or create TermDefinition records
      const termDefinitions = await this.prisma.termDefinition.findMany({
        where: {
          schoolId: requester.schoolId,
          name: { in: ['First_Term', 'Second_Term', 'Third_Term'] },
        },
      });

      const termDefinitionMap = termDefinitions.reduce(
        (acc, td) => {
          acc[td.name] = td.id;
          return acc;
        },
        {} as Record<string, string>,
      );

      // Ensure all required TermDefinitions exist
      const requiredTerms = ['First_Term', 'Second_Term', 'Third_Term'];
      for (const termName of requiredTerms) {
        if (!termDefinitionMap[termName]) {
          // Create missing TermDefinition
          const newTermDef = await this.prisma.termDefinition.create({
            data: {
              name: termName as TermEnum, // Cast to TermEnum
              schoolId: requester.schoolId,
              createdBy: requester.id,
            },
          });
          termDefinitionMap[termName] = newTermDef.id;
        }
      }

      // Create session and session terms in a transaction
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

          // Create session terms
          const sessionTerms = await Promise.all([
            tx.sessionTerm.create({
              data: {
                termDefinitionId: termDefinitionMap['First_Term'],
                sessionId: session.id,
                schoolId: requester.schoolId,
                startDate: new Date(dto.firstTermStartDate),
                endDate: new Date(dto.firstTermEndDate),
                createdBy: requester.id,
              },
            }),
            tx.sessionTerm.create({
              data: {
                termDefinitionId: termDefinitionMap['Second_Term'],
                sessionId: session.id,
                schoolId: requester.schoolId,
                startDate: new Date(dto.secondTermStartDate),
                endDate: new Date(dto.secondTermEndDate),
                createdBy: requester.id,
              },
            }),
            tx.sessionTerm.create({
              data: {
                termDefinitionId: termDefinitionMap['Third_Term'],
                sessionId: session.id,
                schoolId: requester.schoolId,
                startDate: new Date(dto.thirdTermStartDate),
                endDate: new Date(dto.thirdTermEndDate),
                createdBy: requester.id,
              },
            }),
          ]);

          return {
            message: 'Session created successfully',
            session,
            sessionTerms,
          };
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
        {
          name: result.session.name,
          terms: result.sessionTerms.map((t) => ({
            termDefinitionId: t.termDefinitionId,
            startDate: t.startDate,
            endDate: t.endDate,
          })),
        },
        req,
      );

      return {
        statusCode: 201,
        message: 'Session created successfully',
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw new Error(
        'Failed to create session: ' + (error.message || 'Unknown error'),
      );
    }
  }

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

      // Fetch sessions with session terms and class-arm assignments
      const sessions = await this.prisma.session.findMany({
        where: { schoolId: requester.schoolId, isDeleted: false },
        include: {
          school: { select: { name: true } },
          terms: {
            where: { isDeleted: false },
            include: {
              termDefinition: { select: { name: true } }, // Get term name (e.g., First_Term)
            },
            orderBy: { startDate: 'asc' }, // Order terms by start date
          },
          classAssignments: {
            where: { isDeleted: false },
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  classCategory: { select: { id: true, name: true } },
                },
              },
              classArm: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      // Transform the data into the desired format
      const transformedSessions = sessions.map((session) => {
        const terms = session.terms;
        // Fetch all classes for the school
        const allClasses = this.prisma.class.findMany({
          where: { schoolId: requester.schoolId, isDeleted: false },
          include: { classCategory: { select: { id: true, name: true } } },
        });

        // Map class-arm assignments for this session
        const classArmAssignments = session.classAssignments.reduce(
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

        return {
          id: session.id,
          name: session.name,
          status: session.isActive,
          terms: terms.map((term) => ({
            id: term.id,
            name: term.termDefinition.name, // Use TermDefinition name
            startDate: term.startDate.toISOString(),
            endDate: term.endDate.toISOString(),
            status: term.isActive,
          })),
          classes: allClasses.then((classes) =>
            classes.map((cls) => ({
              id: cls.id,
              name: cls.name,
              category: cls.classCategory?.name ?? null,
              assignedArms: classArmAssignments[cls.id] || [],
            })),
          ),
        };
      });

      // Resolve all class promises
      const resolvedSessions = await Promise.all(
        transformedSessions.map(async (session) => ({
          ...session,
          classes: await session.classes, // Resolve the Promise for classes
        })),
      );

      return resolvedSessions;
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
        select: { id: true },
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
            include: {
              termDefinition: { select: { id: true, name: true } },
            },
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
        select: { id: true },
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
        if (isNaN(dates[i].start.getTime()) || isNaN(dates[i].end.getTime())) {
          throw new BadRequestException(
            `Term ${i + 1} has invalid date format`,
          );
        }
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

      // Validate terms (exactly 3, with correct TermDefinition names)
      const terms = session.terms;
      if (terms.length !== 3) {
        throw new BadRequestException('Session must have exactly three terms');
      }
      const expectedTermNames = ['First_Term', 'Second_Term', 'Third_Term'];
      for (let i = 0; i < terms.length; i++) {
        if (terms[i].termDefinition.name !== expectedTermNames[i]) {
          throw new BadRequestException(
            `Term ${i + 1} must be ${expectedTermNames[i]}`,
          );
        }
      }

      // Get current date (06:29 AM WAT, June 12, 2025)
      const currentDate = new Date();

      // Update session and terms in a transaction
      const result = await this.prisma.$transaction(
        async (tx) => {
          // Update session
          const updatedSession = await tx.session.update({
            where: { id },
            data: {
              name: dto.session,
              updatedBy: requester.id,
            },
            select: { id: true, name: true },
          });

          // Update session terms
          const updatedTerms = await Promise.all([
            tx.sessionTerm.update({
              where: { id: terms[0].id },
              data: {
                startDate: new Date(dto.firstTermStartDate),
                endDate: new Date(dto.firstTermEndDate),
                updatedBy: requester.id,
              },
              include: {
                termDefinition: { select: { name: true } },
              },
            }),
            tx.sessionTerm.update({
              where: { id: terms[1].id },
              data: {
                startDate: new Date(dto.secondTermStartDate),
                endDate: new Date(dto.secondTermEndDate),
                updatedBy: requester.id,
              },
              include: {
                termDefinition: { select: { name: true } },
              },
            }),
            tx.sessionTerm.update({
              where: { id: terms[2].id },
              data: {
                startDate: new Date(dto.thirdTermStartDate),
                endDate: new Date(dto.thirdTermEndDate),
                updatedBy: requester.id,
              },
              include: {
                termDefinition: { select: { name: true } },
              },
            }),
          ]);

          // Determine session and term status
          const sessionStart = new Date(dto.firstTermStartDate);
          const sessionEnd = new Date(dto.thirdTermEndDate);
          const isSessionActive =
            currentDate >= sessionStart && currentDate <= sessionEnd;

          return {
            updatedSession,
            updatedTerms,
            isSessionActive,
          };
        },
        { timeout: 10000 },
      );

      // Log action outside the transaction
      await this.loggingService.logAction(
        'update_session',
        'Session',
        result.updatedSession.id,
        requester.id,
        requester.schoolId,
        {
          oldName: session.name,
          newName: dto.session,
          terms: result.updatedTerms.map((t) => ({
            id: t.id,
            name: t.termDefinition.name,
            startDate: t.startDate,
            endDate: t.endDate,
          })),
        },
        req,
      );

      return {
        statusCode: 200,
        message: 'Session updated successfully',
        data: {
          id: result.updatedSession.id,
          name: result.updatedSession.name,
          status: result.isSessionActive ? 'Active' : 'Inactive',
          terms: result.updatedTerms.map((term) => ({
            id: term.id,
            name: term.termDefinition.name,
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
        await tx.sessionTerm.updateMany({
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
      const sessionData = await this.prisma.sessionClassAssignment.findMany({
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

  async assignClassToSession(body: any, user: AuthenticatedUser){
    const {sessionId, classId, classArmId} = body
    const schoolId = user.schoolId 
    try {
      const classSession = await this.prisma.sessionClassAssignment.create({
        data: {
          sessionId,
          classId,
          classArmId,
          schoolId,
          createdBy: user.id,
        }
      })
      return classSession
    }catch(error){
  throw new HttpException(error.message, 500)
    }

  }
  
}
