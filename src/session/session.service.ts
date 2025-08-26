import {
  Injectable,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignClassToSessionDto, CreateSessionDto } from './dto/session.dto';
import { LoggingService } from '@/log/logging.service';
import { AuthenticatedUser } from '@/types/express';
import { TermEnum } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';
import { addDays, differenceInWeeks, startOfWeek, endOfWeek } from 'date-fns'; // Import date-fns utilities

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}
  private readonly logger = new Logger(SessionsService.name);

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT, {
    // @Cron('*/1 * * * *', {
    name: 'checkActiveAndInactiveSession',
    timeZone: 'Africa/Lagos',
  })
  async handleActiveAndInActiveSession() {
    const currentDate = new Date();

    try {
      // Get all schools that are not deleted
      const schools = await this.prisma.school.findMany({
        where: { isDeleted: false },
        select: { id: true, name: true },
      });

      for (const school of schools) {
        await this.processSchoolSessionActivation(school.id, currentDate);
      }

      console.log(
        'Session and term activation/inactivation check completed successfully.',
      );
    } catch (error) {
      console.error('Error in session activation cron job:', error);
    }
  }

  private async processSchoolSessionActivation(
    schoolId: string,
    currentDate: Date,
  ) {
    try {
      // Get all session terms for this school
      const sessionTerms = await this.prisma.sessionTerm.findMany({
        where: {
          schoolId,
          isDeleted: false,
          session: { isDeleted: false },
        },
        include: {
          session: { select: { id: true, name: true } },
          termDefinition: { select: { name: true } },
        },
        orderBy: [{ sessionId: 'asc' }, { startDate: 'asc' }],
      });

      if (sessionTerms.length === 0) {
        return; // No terms for this school
      }

      // Group terms by session
      const sessionGroups = sessionTerms.reduce(
        (groups, term) => {
          const sessionId = term.sessionId;
          if (!groups[sessionId]) {
            groups[sessionId] = {
              sessionId,
              sessionName: term.session.name,
              terms: [],
            };
          }
          groups[sessionId].terms.push(term);
          return groups;
        },
        {} as Record<
          string,
          { sessionId: string; sessionName: string; terms: any[] }
        >,
      );

      // Process each session
      for (const sessionGroup of Object.values(sessionGroups)) {
        await this.processSessionGroup(schoolId, sessionGroup, currentDate);
      }
    } catch (error) {
      console.error(`Error processing school ${schoolId}:`, error);
    }
  }

  private async processSessionGroup(
    schoolId: string,
    sessionGroup: {
      sessionId: string;
      sessionName: string;
      terms: any[];
    },
    currentDate: Date,
  ) {
    const { sessionId, terms } = sessionGroup;

    // Find if any term is currently active (today falls within its date range)
    const activeTerm = terms.find(
      (term) => term.startDate <= currentDate && term.endDate >= currentDate,
    );

    // Calculate session date range (earliest start to latest end)
    const sessionStartDate = new Date(
      Math.min(...terms.map((t) => t.startDate.getTime())),
    );
    const sessionEndDate = new Date(
      Math.max(...terms.map((t) => t.endDate.getTime())),
    );

    // Session is active if current date falls within overall session range
    const isSessionActive =
      currentDate >= sessionStartDate && currentDate <= sessionEndDate;

    await this.prisma.$transaction(async (tx) => {
      if (activeTerm) {
        // Deactivate all terms in this school except the active one
        await tx.sessionTerm.updateMany({
          where: {
            schoolId,
            id: { not: activeTerm.id },
          },
          data: { isActive: false },
        });

        this.logger.log('Deactivating all terms except the active one');

        // Activate the current term
        await tx.sessionTerm.update({
          where: { id: activeTerm.id },
          data: { isActive: true },
        });

        this.logger.log('Activating current term');

        // Update school's current term if this term is active
        await tx.school.update({
          where: { id: schoolId },
          data: {
            currentTermId: activeTerm.id,
            currentSessionId: sessionId,
          },
        });

        this.logger.log('Updating school current term and session');

        console.log(
          `Activated term ${activeTerm.termDefinition.name} for session ${sessionGroup.sessionName} in school ${schoolId}`,
        );
      } else {
        // No active term found, deactivate all terms in this school
        await tx.sessionTerm.updateMany({
          where: { schoolId },
          data: { isActive: false },
        });
        this.logger.log('Deactivating all terms for this session');

        // If no active terms, clear current term but keep session if it's still in range
        if (!isSessionActive) {
          await tx.school.update({
            where: { id: schoolId },
            data: {
              currentTermId: null,
              currentSessionId: null,
            },
          });
        }

        this.logger.log('Clearing current term and session for school');
      }

      // Handle session activation
      if (isSessionActive) {
        // Deactivate all other sessions for this school
        await tx.session.updateMany({
          where: {
            schoolId,
            id: { not: sessionId },
          },
          data: { isActive: false },
        });

        // Activate current session
        await tx.session.update({
          where: { id: sessionId },
          data: { isActive: true },
        });

        this.logger.log('Activating current session');

        // Update school's current session
        await tx.school.update({
          where: { id: schoolId },
          data: { currentSessionId: sessionId },
        });
        this.logger.log('Updating school current session');
        console.log(
          `Activated session ${sessionGroup.sessionName} for school ${schoolId}`,
        );
      } else {
        // Session is not active, deactivate it
        await tx.session.update({
          where: { id: sessionId },
          data: { isActive: false },
        });

        this.logger.log('Deactivating current session');
        // If this was the current session, clear it
        const school = await tx.school.findUnique({
          where: { id: schoolId },
          select: { currentSessionId: true },
        });

        if (school?.currentSessionId === sessionId) {
          await tx.school.update({
            where: { id: schoolId },
            data: {
              currentSessionId: null,
              currentTermId: null,
            },
          });
        }
      }
    });
  }

  // async createSession(dto: CreateSessionDto, req: any) {
  //   const requester = req.user;

  //   try {
  //     // Validate school
  //     const school = await this.prisma.school.findUnique({
  //       where: { id: requester.schoolId },
  //     });
  //     if (!school) {
  //       throw new NotFoundException('School not found');
  //     }

  //     // Validate session doesn't already exist
  //     const existingSession = await this.prisma.session.findFirst({
  //       where: {
  //         name: dto.session,
  //         schoolId: requester.schoolId,
  //         isDeleted: false,
  //       },
  //     });
  //     if (existingSession) {
  //       throw new BadRequestException('Session already exists for this school');
  //     }

  //     // Validate date ranges
  //     const dates = [
  //       {
  //         start: new Date(dto.firstTermStartDate),
  //         end: new Date(dto.firstTermEndDate),
  //       },
  //       {
  //         start: new Date(dto.secondTermStartDate),
  //         end: new Date(dto.secondTermEndDate),
  //       },
  //       {
  //         start: new Date(dto.thirdTermStartDate),
  //         end: new Date(dto.thirdTermEndDate),
  //       },
  //     ];

  //     for (let i = 0; i < dates.length; i++) {
  //       if (isNaN(dates[i].start.getTime()) || isNaN(dates[i].end.getTime())) {
  //         throw new BadRequestException(
  //           `Term ${i + 1} has invalid date format`,
  //         );
  //       }
  //       if (dates[i].start >= dates[i].end) {
  //         throw new BadRequestException(
  //           `Term ${i + 1} start date must be before end date`,
  //         );
  //       }
  //       if (i > 0 && dates[i].start <= dates[i - 1].end) {
  //         throw new BadRequestException(
  //           `Term ${i + 1} start date must be after Term ${i} end date`,
  //         );
  //       }
  //     }
  //     // Fetch or create TermDefinition records
  //     const termDefinitions = await this.prisma.termDefinition.findMany({
  //       where: {
  //         schoolId: requester.schoolId,
  //         name: { in: ['First_Term', 'Second_Term', 'Third_Term'] },
  //       },
  //     });

  //     const termDefinitionMap = termDefinitions.reduce(
  //       (acc, td) => {
  //         acc[td.name] = td.id;
  //         return acc;
  //       },
  //       {} as Record<string, string>,
  //     );

  //     // Ensure all required TermDefinitions exist
  //     const requiredTerms = ['First_Term', 'Second_Term', 'Third_Term'];
  //     for (const termName of requiredTerms) {
  //       if (!termDefinitionMap[termName]) {
  //         // Create missing TermDefinition
  //         const newTermDef = await this.prisma.termDefinition.create({
  //           data: {
  //             name: termName as TermEnum, // Cast to TermEnum
  //             schoolId: requester.schoolId,
  //             createdBy: requester.id,
  //           },
  //         });
  //         termDefinitionMap[termName] = newTermDef.id;
  //       }
  //     }

  //     //  create weeks automatically after creating term weeks per term base on the duration    

  //     // Create session and session terms in a transaction
  //     const result = await this.prisma.$transaction(
  //       async (tx) => {
  //         // Create session
  //         const session = await tx.session.create({
  //           data: {
  //             name: dto.session,
  //             schoolId: requester.schoolId,
  //             createdBy: requester.id,
  //           },
  //         });

  //         // Create session terms
  //         const sessionTerms = await Promise.all([
  //           tx.sessionTerm.create({
  //             data: {
  //               termDefinitionId: termDefinitionMap['First_Term'],
  //               sessionId: session.id,
  //               schoolId: requester.schoolId,
  //               startDate: new Date(dto.firstTermStartDate),
  //               endDate: new Date(dto.firstTermEndDate),
  //               createdBy: requester.id,
  //             },
  //           }),
  //           tx.sessionTerm.create({
  //             data: {
  //               termDefinitionId: termDefinitionMap['Second_Term'],
  //               sessionId: session.id,
  //               schoolId: requester.schoolId,
  //               startDate: new Date(dto.secondTermStartDate),
  //               endDate: new Date(dto.secondTermEndDate),
  //               createdBy: requester.id,
  //             },
  //           }),
  //           tx.sessionTerm.create({
  //             data: {
  //               termDefinitionId: termDefinitionMap['Third_Term'],
  //               sessionId: session.id,
  //               schoolId: requester.schoolId,
  //               startDate: new Date(dto.thirdTermStartDate),
  //               endDate: new Date(dto.thirdTermEndDate),
  //               createdBy: requester.id,
  //             },
  //           }),
  //         ]);

  //         return {
  //           message: 'Session created successfully',
  //           session,
  //           sessionTerms,
  //         };
  //       },
  //       { timeout: 10000 }, // Increase timeout to 10 seconds
  //     );

  //     // Log action outside the transaction
  //     await this.loggingService.logAction(
  //       'create_session',
  //       'Session',
  //       result.session.id,
  //       requester.id,
  //       requester.schoolId,
  //       {
  //         name: result.session.name,
  //         terms: result.sessionTerms.map((t) => ({
  //           termDefinitionId: t.termDefinitionId,
  //           startDate: t.startDate,
  //           endDate: t.endDate,
  //         })),
  //       },
  //       req,
  //     );

  //     return {
  //       statusCode: 201,
  //       message: 'Session created successfully',
  //     };
  //   } catch (error) {
  //     console.error('Error creating session:', error);
  //     throw new Error(
  //       'Failed to create session: ' + (error.message || 'Unknown error'),
  //     );
  //   }
  // }


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
        throw new BadRequestException(`Term ${i + 1} has invalid date format`);
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
        const newTermDef = await this.prisma.termDefinition.create({
          data: {
            name: termName as TermEnum,
            schoolId: requester.schoolId,
            createdBy: requester.id,
          },
        });
        termDefinitionMap[termName] = newTermDef.id;
      }
    }

    // Create session, session terms, and weeks in a transaction
   // ... (rest of your code remains the same up to the transaction)

// Create session, session terms, and weeks in a transaction
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

    // Create session terms (keep as-is, since only 3)
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

    // Prepare batch data for weeks
    const weeksData = [];
    for (let i = 0; i < sessionTerms.length; i++) {
      const term = sessionTerms[i];
      const termStart = new Date(term.startDate);
      const termEnd = new Date(term.endDate);

      // Calculate the number of weeks (including partial weeks)
      const totalWeeks = differenceInWeeks(termEnd, termStart) + 1;

      // Generate week data
      for (let weekNum = 1; weekNum <= totalWeeks; weekNum++) {
        const weekStart = addDays(termStart, (weekNum - 1) * 7);
        let weekEnd = addDays(weekStart, 6); // Full 7-day week

        // Ensure the week doesn't exceed the term's end date
        if (weekEnd > termEnd) {
          weekEnd = termEnd;
        }

        // For Monday-to-Friday weeks, adjust as needed (commented out as in your original)
        // const weekStart = startOfWeek(addDays(termStart, (weekNum - 1) * 7), { weekStartsOn: 1 }); // Monday
        // let weekEnd = addDays(weekStart, 4); // Friday
        // if (weekEnd > termEnd) weekEnd = termEnd;

        weeksData.push({
          name: `Week ${weekNum}`,
          schoolId: requester.schoolId,
          sessionId: session.id,
          termId: term.termDefinitionId, // Use termDefinitionId as termId
          createdAt: new Date(),
          startDate: weekStart,
          endDate: weekEnd,
        });
      }
    }

    // Batch create all weeks
    await tx.weeks.createMany({
      data: weeksData,
    });

    // If you need the created weeks for logging, fetch them after createMany (note: createMany doesn't return records, so query if needed)
    const weeks = await tx.weeks.findMany({
      where: { sessionId: session.id },
      orderBy: { startDate: 'asc' }, // Optional: to sort them
    });

    return {
      message: 'Session created successfully',
      session,
      sessionTerms,
      weeks, // Now fetched after batch create
    };
  },
  { timeout: 30000 }, // Increased to 30 seconds for safety
 );

// ... (rest of your code remains the same, including logging)

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
        weeks: result.weeks.map((w) => ({
          name: w.name,
          termId: w.termId,
          startDate: w.startDate,
          endDate: w.endDate,
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

  async getSessionsBySchoolPublic(schoolId: string) {
    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Fetch sessions with only id and name
      const sessions = await this.prisma.session.findMany({
        where: { schoolId, isDeleted: false },
        select: {
          id: true,
          name: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      return sessions;
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

  async getSessionClassArm(
    sessionId: string | null,
    stats: boolean,
    user: AuthenticatedUser,
  ) {
    try {
      const schoolId = user.schoolId;

      // If sessionId is not provided, fetch current session from school
      let currentSessionId = sessionId;
      let currentTermId = null;
      let sessionName = null;
      let termName = null;

      if (!currentSessionId || stats) {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolId },
          include: {
            currentSession: { select: { id: true, name: true } },
            currentTerm: {
              include: {
                termDefinition: { select: { id: true, name: true } },
              },
            },
          },
        });

        if (!currentSessionId && school?.currentSession) {
          currentSessionId = school.currentSession.id;
          sessionName = school.currentSession.name;
        }

        if (school?.currentTerm) {
          currentTermId = school.currentTerm.id;
          termName = school.currentTerm.termDefinition?.name;
        }
      }

      // If still no session found, throw error
      if (!currentSessionId) {
        throw new NotFoundException('No active session found for the school');
      }

      const sessionData = await this.prisma.sessionClassAssignment.findMany({
        where: { sessionId: currentSessionId, schoolId },
        include: {
          class: true,
          classArm: true,
          session: { select: { id: true, name: true } },
        },
      });

      if (!sessionData || sessionData.length === 0) {
        throw new NotFoundException('Session not found or no data available');
      }

      // Extract session name if not already fetched
      if (!sessionName && sessionData.length > 0) {
        sessionName = sessionData[0].session.name;
      }

      // Transform data into the desired format with base response
      const formattedData: any = {
        sessionId: currentSessionId,
        sessionName: sessionName,
        classes: this.groupClassArmsByClass(sessionData),
      };

      // Add term info if available
      if (currentTermId) {
        formattedData.currentTermId = currentTermId;
        formattedData.currentTermName = this.formatTermName(termName);
      }

      // Add stats if requested
      if (stats) {
        await this.addClassStats(formattedData, currentSessionId, schoolId);
      }

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

  async assignClassToSession(
    sessionId: string,
    dto: AssignClassToSessionDto,
    req: any,
  ) {
    const user = req.user as AuthenticatedUser;

    try {
      // Validate subject exists and belongs to the school
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (!session) {
        throw new HttpException(
          'Session not found or does not belong to your school',
          HttpStatus.NOT_FOUND,
        );
      }

      // Validate assignments
      if (!dto.assignments || dto.assignments.length === 0) {
        throw new HttpException(
          'At least one class assignment must be provided',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Extract all unique class IDs and class arm IDs
      const classIds = [...new Set(dto.assignments.map((a) => a.classId))];
      const allClassArmIds = dto.assignments.flatMap((a) => a.classArmIds);
      const uniqueClassArmIds = [...new Set(allClassArmIds)];

      // Validate all classes belong to the school
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (classes.length !== classIds.length) {
        throw new HttpException(
          'One or more classes not found or do not belong to your school',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate all class arms belong to the school and their respective classes
      const classArms = await this.prisma.classArm.findMany({
        where: {
          id: { in: uniqueClassArmIds },
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true, schoolId: true },
      });

      if (classArms.length !== uniqueClassArmIds.length) {
        throw new HttpException(
          'One or more class arms not found or do not belong to your school',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate that each class arm belongs to its specified class
      for (const assignment of dto.assignments) {
        const classArmsForClass = await this.prisma.classArm.findMany({
          where: {
            id: { in: assignment.classArmIds },
            schoolId: user.schoolId,
            isDeleted: false,
          },
          select: { id: true },
        });

        if (classArmsForClass.length !== assignment.classArmIds.length) {
          throw new HttpException(
            `Some class arms do not exist for class ID: ${assignment.classId}`,
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // Create assignments in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Delete existing assignments for this subject and the specified classes/arms
        await tx.sessionClassAssignment.deleteMany({
          where: {
            sessionId,
            schoolId: user.schoolId,
            OR: dto.assignments.map((assignment) => ({
              classId: assignment.classId,
              classArmId: { in: assignment.classArmIds },
            })),
          },
        });

        // Create new assignments
        const newAssignments = [];
        for (const assignment of dto.assignments) {
          for (const classArmId of assignment.classArmIds) {
            newAssignments.push({
              classId: assignment.classId,
              classArmId,
              sessionId,
              schoolId: user.schoolId,
              createdBy: user.id,
            });
          }
        }

        const createdAssignments = await tx.sessionClassAssignment.createMany({
          data: newAssignments,
        });

        return createdAssignments;
      });

      return {
        statusCode: 200,
        message: 'Session assigned to classes successfully',
        data: {
          sessionId,
          sessionName: session.name,
          assignments: dto.assignments.map((assignment) => ({
            classId: assignment.classId,
            classArmIds: assignment.classArmIds,
          })),
          totalAssignments: result.count,
        },
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error('Error assigning session to classes:', error);
      throw new HttpException(
        'Failed to assign session to classes: ' +
          (error.message || 'Unknown error'),
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Format term name for display (e.g., "first_term" → "First Term")
   */
  private formatTermName(termName: string): string {
    if (!termName) return '';
    return termName
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  /**
   * Add class stats to the response object
   */
  private async addClassStats(
    formattedData: any,
    sessionId: string,
    schoolId: string,
  ) {
    // Get all classes from the data
    // const classIds = formattedData.classes.map((c: any) => c.id);

    // For each class, fetch student counts
    for (const classObj of formattedData.classes) {
      const classId = classObj.id;
      const classArmIds = classObj.classArms.map((arm: any) => arm.id);

      // Get student assignments for this class/session
      const studentsCount = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId: { in: classArmIds },
          schoolId,
          isActive: true,
        },
      });

      // Get male students count
      const maleCount = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId: { in: classArmIds },
          schoolId,
          isActive: true,
          student: {
            user: {
              gender: 'male',
            },
          },
        },
      });

      // Get female students count
      const femaleCount = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId: { in: classArmIds },
          schoolId,
          isActive: true,
          student: {
            user: {
              gender: 'female',
            },
          },
        },
      });

      // Add stats to the class object
      classObj.stats = {
        totalClassArms: classObj.classArms.length,
        totalStudents: studentsCount,
        maleStudents: maleCount,
        femaleStudents: femaleCount,
      };

      // Add stats for each class arm
      for (const arm of classObj.classArms) {
        const armStudentsCount = await this.prisma.studentClassAssignment.count(
          {
            where: {
              sessionId,
              classId,
              classArmId: arm.id,
              schoolId,
              isActive: true,
            },
          },
        );

        const armMaleCount = await this.prisma.studentClassAssignment.count({
          where: {
            sessionId,
            classId,
            classArmId: arm.id,
            schoolId,
            isActive: true,
            student: {
              user: {
                gender: 'male',
              },
            },
          },
        });

        const armFemaleCount = await this.prisma.studentClassAssignment.count({
          where: {
            sessionId,
            classId,
            classArmId: arm.id,
            schoolId,
            isActive: true,
            student: {
              user: {
                gender: 'female',
              },
            },
          },
        });

        arm.stats = {
          totalStudents: armStudentsCount,
          maleStudents: armMaleCount,
          femaleStudents: armFemaleCount,
        };
      }
    }
  }

  /**
   * Get class details in a session by class ID
   */
  async getSessionClassById(
    sessionId: string | null,
    classId: string,
    user: AuthenticatedUser,
  ) {
    try {
      const schoolId = user.schoolId;

      // Validate inputs
      if (!classId) {
        throw new BadRequestException('Class ID is required');
      }

      // If sessionId is not provided, fetch current session from school
      let currentSessionId = sessionId;
      let sessionName = null;

      if (!currentSessionId) {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolId },
          include: {
            currentSession: { select: { id: true, name: true } },
          },
        });

        if (school?.currentSession) {
          currentSessionId = school.currentSession.id;
          sessionName = school.currentSession.name;
        } else {
          throw new NotFoundException('No active session found for the school');
        }
      }

      // Fetch the session to verify it exists if we don't already have the name
      let session;
      if (!sessionName) {
        session = await this.prisma.session.findFirst({
          where: {
            id: currentSessionId,
            schoolId,
            isDeleted: false,
          },
          select: {
            id: true,
            name: true,
          },
        });

        if (!session) {
          throw new NotFoundException('Session not found');
        }

        sessionName = session.name;
      }

      // Fetch the class to verify it exists
      const classDetails = await this.prisma.class.findFirst({
        where: {
          id: classId,
          schoolId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          classCategory: { select: { id: true, name: true } },
        },
      });

      if (!classDetails) {
        throw new NotFoundException('Class not found');
      }

      // Fetch all class arms assigned to this class in this session
      const classArmsData = await this.prisma.sessionClassAssignment.findMany({
        where: {
          sessionId: currentSessionId,
          classId,
          schoolId,
        },
        include: {
          classArm: true,
        },
      });

      // Get current term if available
      const school = await this.prisma.school.findUnique({
        where: { id: schoolId },
        include: {
          currentTerm: {
            include: {
              termDefinition: { select: { id: true, name: true } },
            },
          },
        },
      });

      const currentTermId = school?.currentTerm?.id;
      const termName = school?.currentTerm?.termDefinition?.name;

      // Format response
      const classArms = classArmsData.map((item) => ({
        id: item.classArm.id,
        name: item.classArm.name,
      }));

      const response: any = {
        session: {
          id: currentSessionId,
          name: sessionName,
        },
        class: {
          id: classDetails.id,
          name: classDetails.name,
          category: classDetails.classCategory?.name,
        },
        classArms: classArms,
      };

      // Add current term info if available
      if (currentTermId) {
        response.currentTerm = {
          id: currentTermId,
          name: this.formatTermName(termName),
        };
      }

      // Add stats
      const stats = {
        totalClassArms: classArms.length,
        totalStudents: 0,
        maleStudents: 0,
        femaleStudents: 0,
      };

      // Get student counts
      stats.totalStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId: currentSessionId,
          classId,
          schoolId,
          isActive: true,
          classArmId: { in: classArms.map((arm) => arm.id) },
        },
      });

      stats.maleStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId: currentSessionId,
          classId,
          schoolId,
          isActive: true,
          classArmId: { in: classArms.map((arm) => arm.id) },
          student: {
            user: {
              gender: 'male',
            },
          },
        },
      });

      stats.femaleStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId: currentSessionId,
          classId,
          schoolId,
          isActive: true,
          classArmId: { in: classArms.map((arm) => arm.id) },
          student: {
            user: {
              gender: 'female',
            },
          },
        },
      });

      response.stats = stats;

      // Add stats for each class arm
      for (const arm of classArms) {
        const armTotalStudents = await this.prisma.studentClassAssignment.count(
          {
            where: {
              sessionId: currentSessionId,
              classId,
              classArmId: arm.id,
              schoolId,
              isActive: true,
            },
          },
        );

        const armStats = {
          totalStudents: armTotalStudents,
          maleStudents: await this.prisma.studentClassAssignment.count({
            where: {
              sessionId: currentSessionId,
              classId,
              classArmId: arm.id,
              schoolId,
              isActive: true,
              student: {
                user: {
                  gender: 'male',
                },
              },
            },
          }),
          femaleStudents: await this.prisma.studentClassAssignment.count({
            where: {
              sessionId: currentSessionId,
              classId,
              classArmId: arm.id,
              schoolId,
              isActive: true,
              student: {
                user: {
                  gender: 'female',
                },
              },
            },
          }),
          percentage:
            stats.totalStudents > 0
              ? Math.round(
                  (armTotalStudents / stats.totalStudents) * 100 * 100,
                ) / 100
              : 0,
        };

        (arm as any).stats = armStats;
      }

      return response;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error fetching class details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get class arm details in a session
   */
  async getSessionClassArmById(
    sessionId: string,
    termId: string,
    classId: string,
    classArmId: string,
    user: AuthenticatedUser,
  ) {
    try {
      const schoolId = user.schoolId;

      // Validate inputs
      if (!sessionId || !classId || !classArmId) {
        throw new BadRequestException(
          'Session ID, Class ID, and Class Arm ID are required',
        );
      }

      // Fetch the session to verify it exists
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          schoolId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!session) {
        throw new NotFoundException('Session not found');
      }

      // Fetch the class to verify it exists
      const classDetails = await this.prisma.class.findFirst({
        where: {
          id: classId,
          schoolId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
          classCategory: { select: { id: true, name: true } },
        },
      });

      if (!classDetails) {
        throw new NotFoundException('Class not found');
      }

      // Fetch the class arm to verify it exists
      const classArmDetails = await this.prisma.classArm.findFirst({
        where: {
          id: classArmId,
          schoolId,
          isDeleted: false,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!classArmDetails) {
        throw new NotFoundException('Class arm not found');
      }

      // Fetch the term details
      const termDetails = await this.prisma.termDefinition.findFirst({
        where: {
          id: termId,
          schoolId,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!termDetails) {
        throw new NotFoundException('Term not found');
      }

      // Check if the class arm is assigned to this class in this session
      const assignmentExists =
        await this.prisma.sessionClassAssignment.findFirst({
          where: {
            sessionId,
            classId,
            classArmId,
            schoolId,
          },
        });

      if (!assignmentExists) {
        throw new NotFoundException(
          'Class arm is not assigned to this class in this session',
        );
      }

      // Get student counts
      const totalStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId,
          schoolId,
          isActive: true,
        },
      });

      const maleStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId,
          schoolId,
          isActive: true,
          student: {
            user: {
              gender: 'male',
            },
          },
        },
      });

      const femaleStudents = await this.prisma.studentClassAssignment.count({
        where: {
          sessionId,
          classId,
          classArmId,
          schoolId,
          isActive: true,
          student: {
            user: {
              gender: 'female',
            },
          },
        },
      });

      // Fetch assigned subjects
      const assignedSubjects =
        await this.prisma.classArmSubjectAssignment.findMany({
          where: {
            classId,
            classArmId,
            schoolId,
            isActive: true,
          },
          include: {
            subject: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
          },
        });

      // Format response
      return {
        session: {
          id: session.id,
          name: session.name,
        },
        term: {
          id: termDetails.id,
          name: this.formatTermName(termDetails.name),
        },
        class: {
          id: classDetails.id,
          name: classDetails.name,
          category: classDetails.classCategory?.name,
        },
        classArm: {
          id: classArmDetails.id,
          name: classArmDetails.name,
        },
        stats: {
          totalStudents,
          maleStudents,
          femaleStudents,
        },
        subjects: assignedSubjects.map((item) => ({
          id: item.subject.id,
          name: item.subject.name,
          code: item.subject.code,
        })),
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Error fetching class arm details: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
