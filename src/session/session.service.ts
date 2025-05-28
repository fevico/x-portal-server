import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto, UpdateSessionDto } from './dto/session.dto';
import { LoggingService } from '@/log/logging.service';

@Injectable()
export class SessionsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async createSession(dto: CreateSessionDto, req: any) {
    const {
      name,
      schoolId,
      firstTermStart,
      firstTermEnd,
      secondTermStart,
      secondTermEnd,
      thirdTermStart,
      thirdTermEnd,
      isActive,
    } = dto;
    const requester = req.user;

    // Validate school
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate permissions
    if (requester.role !== 'superAdmin' && requester.schoolId !== schoolId) {
      throw new ForbiddenException(
        'You can only create sessions for your school',
      );
    }

    // Check for duplicate session name in school
    const existingSession = await this.prisma.session.findUnique({
      where: { name_schoolId: { name, schoolId } },
    });
    if (existingSession) {
      throw new BadRequestException(
        'Session name already exists for this school',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Create session
      const session = await tx.session.create({
        data: {
          name,
          schoolId,
          firstTermStart: firstTermStart ? new Date(firstTermStart) : null,
          firstTermEnd: firstTermEnd ? new Date(firstTermEnd) : null,
          secondTermStart: secondTermStart ? new Date(secondTermStart) : null,
          secondTermEnd: secondTermEnd ? new Date(secondTermEnd) : null,
          thirdTermStart: thirdTermStart ? new Date(thirdTermStart) : null,
          thirdTermEnd: thirdTermEnd ? new Date(thirdTermEnd) : null,
          isActive,
          createdBy: requester.id,
        },
        include: {
          school: { select: { name: true } },
        },
      });

      await this.loggingService.logAction(
        'create_session',
        'Session',
        session.id,
        requester.id,
        schoolId,
        { name: session.name },
        req,
      );

      return session;
    });
  }

  async getSession(id: string, req: any) {
    const requester = req.user;

    // Validate session
    const session = await this.prisma.session.findUnique({
      where: { id, isDeleted: false },
      include: {
        school: { select: { name: true } },
        classArms: { include: { classArm: { select: { name: true } } } },
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate permissions
    if (
      requester.role !== 'superAdmin' &&
      requester.schoolId !== session.schoolId
    ) {
      throw new ForbiddenException(
        'You can only access sessions for your school',
      );
    }

    return session;
  }

  async getSessionsBySchool(schoolId: string, req: any) {
    const requester = req.user;

    // Validate school
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
    });
    if (!school) {
      throw new NotFoundException('School not found');
    }

    // Validate permissions
    if (requester.role !== 'superAdmin' && requester.schoolId !== schoolId) {
      throw new ForbiddenException(
        'You can only access sessions for your school',
      );
    }

    return this.prisma.session.findMany({
      where: { schoolId, isDeleted: false },
      include: {
        school: { select: { name: true } },
        classArms: { include: { classArm: { select: { name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSession(id: string, dto: UpdateSessionDto, req: any) {
    const requester = req.user;

    // Validate session
    const session = await this.prisma.session.findUnique({
      where: { id, isDeleted: false },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate permissions
    if (
      requester.role !== 'superAdmin' &&
      requester.schoolId !== session.schoolId
    ) {
      throw new ForbiddenException(
        'You can only update sessions for your school',
      );
    }

    // Check for duplicate name if provided
    if (dto.name && dto.name !== session.name) {
      const existingSession = await this.prisma.session.findUnique({
        where: {
          name_schoolId: { name: dto.name, schoolId: session.schoolId },
        },
      });
      if (existingSession) {
        throw new BadRequestException(
          'Session name already exists for this school',
        );
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update session
      const updatedSession = await tx.session.update({
        where: { id },
        data: {
          name: dto.name,
          firstTermStart: dto.firstTermStart
            ? new Date(dto.firstTermStart)
            : undefined,
          firstTermEnd: dto.firstTermEnd
            ? new Date(dto.firstTermEnd)
            : undefined,
          secondTermStart: dto.secondTermStart
            ? new Date(dto.secondTermStart)
            : undefined,
          secondTermEnd: dto.secondTermEnd
            ? new Date(dto.secondTermEnd)
            : undefined,
          thirdTermStart: dto.thirdTermStart
            ? new Date(dto.thirdTermStart)
            : undefined,
          thirdTermEnd: dto.thirdTermEnd
            ? new Date(dto.thirdTermEnd)
            : undefined,
          isActive: dto.isActive,
          updatedBy: requester.id,
        },
        include: {
          school: { select: { name: true } },
          classArms: { include: { classArm: { select: { name: true } } } },
        },
      });

      await this.loggingService.logAction(
        'update_session',
        'Session',
        id,
        requester.id,
        session.schoolId,
        { updatedFields: Object.keys(dto) },
        req,
      );

      return updatedSession;
    });
  }

  async deleteSession(id: string, req: any) {
    const requester = req.user;

    // Validate session
    const session = await this.prisma.session.findUnique({
      where: { id, isDeleted: false },
    });
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate permissions
    if (
      requester.role !== 'superAdmin' &&
      requester.schoolId !== session.schoolId
    ) {
      throw new ForbiddenException(
        'You can only delete sessions for your school',
      );
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

    return await this.prisma.$transaction(async (tx) => {
      // Soft delete session
      const deletedSession = await tx.session.update({
        where: { id },
        data: {
          isDeleted: true,
          updatedBy: requester.id,
        },
        include: {
          school: { select: { name: true } },
        },
      });

      await this.loggingService.logAction(
        'delete_session',
        'Session',
        id,
        requester.id,
        session.schoolId,
        { name: session.name },
        req,
      );

      return deletedSession;
    });
  }
}
