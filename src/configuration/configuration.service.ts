import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  AssignClassesDto,
  AssignMarkingSchemeDto,
  CreateGradingSystemDto,
  CreateMarkingSchemeDto,
  UpdateSchoolInfoDto,
} from './dto/configuration';
import { AuthenticatedUser } from '@/types/express';
// import { v2 as cloudinary } from 'cloudinary';
import { uploadToCloudinary } from '@/utils';
import { AssessmentType } from '@prisma/client';
import { LoggingService } from '@/log/logging.service';

@Injectable()
export class ConfigurationService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async updateSchoolInformation(
    body: UpdateSchoolInfoDto,
    user: AuthenticatedUser,
    logo: Express.Multer.File,
    schoolHeadSignature?: Express.Multer.File,
    principalSignature?: Express.Multer.File,
    bursarSignature?: Express.Multer.File,
  ) {
    const {
      address,
      color,
      country,
      email,
      name,
      state,
      bursarContact,
      bursarName,
      bursarSignatureBase64,
      principalContact,
      principalName,
      principalSignatureBase64,
      schoolHeadContact,
      schoolHeadName,
      schoolHeadSignatureBase64,
      logoBase64,
    } = body;
    if (!user || !user.schoolId)
      throw new NotFoundException(
        'User not found or not associated with a school',
      );
    try {
      let logoImageUrl: string | undefined;
      let logoPubId: string | undefined;
      let principalSignatureUrl: string | undefined;
      let principalSignaturePubId: string | undefined;
      let schoolHeadSignatureUrl: string | undefined;
      let schoolHeadSignaturePubId: string | undefined;
      let bursarSignatureUrl: string | undefined;
      let bursarSignaturePubId: string | undefined;

      try {
        // Handle logo upload
        if (logo) {
          const uploadResult = await uploadToCloudinary(logo.buffer, {
            folder: 'configuration/logos',
            transformation: { width: 800, height: 800, crop: 'limit' },
          });
          logoImageUrl = uploadResult.imageUrl;
          logoPubId = uploadResult.pubId;
        } else if (logoBase64) {
          const uploadResult = await uploadToCloudinary(logoBase64, {
            folder: 'configuration/logos',
            transformation: { width: 800, height: 800, crop: 'limit' },
          });
          logoImageUrl = uploadResult.imageUrl;
          logoPubId = uploadResult.pubId;
        }

        if (principalSignature) {
          const uploadResult = await uploadToCloudinary(
            principalSignature.buffer,
            {
              folder: 'configuration/signatures',
              transformation: { width: 600, height: 200, crop: 'limit' },
            },
          );
          principalSignatureUrl = uploadResult.imageUrl;
          principalSignaturePubId = uploadResult.pubId;
        }
        // Handle principal signature upload
        else if (principalSignatureBase64) {
          const uploadResult = await uploadToCloudinary(
            principalSignatureBase64,
            {
              folder: 'configuration/signatures',
              transformation: { width: 600, height: 200, crop: 'limit' },
            },
          );
          principalSignatureUrl = uploadResult.imageUrl;
          principalSignaturePubId = uploadResult.pubId;
        }

        if (schoolHeadSignature) {
          const uploadResult = await uploadToCloudinary(
            schoolHeadSignature.buffer,
            {
              folder: 'configuration/signatures',
              transformation: { width: 600, height: 200, crop: 'limit' },
            },
          );
          schoolHeadSignatureUrl = uploadResult.imageUrl;
          schoolHeadSignaturePubId = uploadResult.pubId;
        }
        // Handle school head signature upload
        else if (schoolHeadSignatureBase64) {
          const uploadResult = await uploadToCloudinary(
            schoolHeadSignatureBase64,
            {
              folder: 'configuration/signatures',
              transformation: { width: 600, height: 200, crop: 'limit' },
            },
          );
          schoolHeadSignatureUrl = uploadResult.imageUrl;
          schoolHeadSignaturePubId = uploadResult.pubId;
        }

        if (bursarSignature) {
          const uploadResult = await uploadToCloudinary(
            bursarSignature.buffer,
            {
              folder: 'configuration/signatures',
              transformation: { width: 600, height: 200, crop: 'limit' },
            },
          );
          bursarSignatureUrl = uploadResult.imageUrl;
          bursarSignaturePubId = uploadResult.pubId;
        }
        // Handle bursar signature upload
        else if (bursarSignatureBase64) {
          const uploadResult = await uploadToCloudinary(bursarSignatureBase64, {
            folder: 'configuration/signatures',
            transformation: { width: 600, height: 200, crop: 'limit' },
          });
          bursarSignatureUrl = uploadResult.imageUrl;
          bursarSignaturePubId = uploadResult.pubId;
        }
      } catch (error) {
        console.error('Image upload error:', error);
        throw new BadRequestException('Failed to upload image to Cloudinary');
      }

      const schoolId = user.schoolId;

      // Prepare update data object
      const updateData: any = {
        color,
        country,
        state,
        bursarContact,
        bursarName,
        principalContact,
        principalName,
        schoolHeadContact,
        schoolHeadName,
      };

      // Only update logo if uploaded
      if (logoImageUrl && logoPubId) {
        updateData.logo = { imageUrl: logoImageUrl, pubId: logoPubId };
      }

      // Only update signatures if uploaded
      if (principalSignatureUrl && principalSignaturePubId) {
        updateData.principalSignature = {
          imageUrl: principalSignatureUrl,
          pubId: principalSignaturePubId,
        };
      }

      if (schoolHeadSignatureUrl && schoolHeadSignaturePubId) {
        updateData.schoolHeadSignature = {
          imageUrl: schoolHeadSignatureUrl,
          pubId: schoolHeadSignaturePubId,
        };
      }

      if (bursarSignatureUrl && bursarSignaturePubId) {
        updateData.bursarSignature = {
          imageUrl: bursarSignatureUrl,
          pubId: bursarSignaturePubId,
        };
      }

      const school = await this.prisma.configuration.update({
        where: { schoolId },
        data: updateData,
      });

      if (!school)
        throw new NotFoundException('School data not found for this user');

      const schoolInfo = await this.prisma.school.update({
        where: { id: schoolId },
        data: {
          address,
          email,
          name,
        },
      });

      if (!schoolInfo)
        throw new NotFoundException('School information not found!');

      return school;
    } catch (error) {
      throw new HttpException('Failed to update school information', 500);
    }
  }

  async getSchoolInformation(user: AuthenticatedUser) {
    if (!user || !user.schoolId)
      throw new NotFoundException(
        'User not found or not associated with a school',
      );
    try {
      const schoolId = user.schoolId;
      const school = await this.prisma.configuration.findUnique({
        where: { schoolId },
        include: { school: true },
      });
      if (!school)
        throw new NotFoundException('School data not found for this user');
      return { school, message: 'School information retrieved successfully' };
    } catch (error) {
      throw new HttpException('Failed to get school information', 500);
    }
  }

  // Assign Marking Scheme to Classes and Term Definitions
  async assignMarkingSchemeToClassesAndTerms(
    markingSchemeId: string,
    dto: AssignMarkingSchemeDto,
    req: any,
  ) {
    const requester = req.user;

    try {
      // Validate marking scheme
      const markingScheme = await this.prisma.markingScheme.findUnique({
        where: {
          id: markingSchemeId,
          schoolId: requester.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });
      if (!markingScheme) {
        throw new NotFoundException('Marking scheme not found');
      }

      // Validate assignments
      if (!dto.assignments || dto.assignments.length === 0) {
        throw new BadRequestException(
          'At least one class and term definition assignment is required',
        );
      }

      const classIds = [...new Set(dto.assignments.map((a) => a.classId))];
      const termDefinitionIds = [
        ...new Set(dto.assignments.map((a) => a.termDefinitionId)),
      ];

      // Validate classes
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: classIds },
          schoolId: requester.schoolId,
          isDeleted: false,
        },
      });
      if (classes.length !== classIds.length) {
        throw new BadRequestException('One or more class IDs are invalid');
      }

      // Validate term definitions
      const termDefinitions = await this.prisma.termDefinition.findMany({
        where: { id: { in: termDefinitionIds }, schoolId: requester.schoolId },
      });
      if (termDefinitions.length !== termDefinitionIds.length) {
        throw new BadRequestException(
          'One or more term definition IDs are invalid',
        );
      }

      // Update assignments in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Clear existing assignments for this marking scheme
        await tx.classTermMarkingSchemeAssignment.deleteMany({
          where: { markingSchemeId, schoolId: requester.schoolId },
        });

        // Create new assignments
        const assignments = await Promise.all(
          dto.assignments.map((assignment) =>
            tx.classTermMarkingSchemeAssignment.create({
              data: {
                markingSchemeId,
                classId: assignment.classId,
                termDefinitionId: assignment.termDefinitionId,
                schoolId: requester.schoolId,
                createdBy: requester.id,
              },
            }),
          ),
        );

        return assignments;
      });

      // Log action
      await this.loggingService.logAction(
        'assign_marking_scheme',
        'MarkingScheme',
        markingSchemeId,
        requester.id,
        requester.schoolId,
        {
          markingSchemeName: markingScheme.name,
          assignments: dto.assignments,
        },
        req,
      );

      return {
        statusCode: 200,
        message: 'Marking scheme assigned successfully',
        data: {
          markingSchemeId,
          assignments: result.map((a) => ({
            classId: a.classId,
            termDefinitionId: a.termDefinitionId,
          })),
        },
      };
    } catch (error) {
      console.error('Error assigning marking scheme:', error);
      throw new Error(
        'Failed to assign marking scheme: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // Update Marking Scheme
  async updateMarkingScheme(id: string, dto: CreateMarkingSchemeDto, req: any) {
    const requester = req.user;

    try {
      // Validate marking scheme
      const markingScheme = await this.prisma.markingScheme.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!markingScheme) {
        throw new NotFoundException('Marking scheme not found');
      }

      // Validate total score
      const totalScore = dto.components.reduce(
        (sum, comp) => sum + comp.score,
        0,
      );
      if (totalScore !== 100) {
        throw new BadRequestException('Total score of components must be 100');
      }

      // Validate name uniqueness
      const existingMarkingScheme = await this.prisma.markingScheme.findFirst({
        where: {
          name: dto.name,
          schoolId: requester.schoolId,
          isDeleted: false,
          NOT: { id },
        },
      });
      if (existingMarkingScheme) {
        throw new BadRequestException('Marking scheme name already exists');
      }

      // Update marking scheme and components in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Update marking scheme
        const updatedMarkingScheme = await tx.markingScheme.update({
          where: { id },
          data: {
            name: dto.name,
            updatedBy: requester.id,
          },
        });

        // Delete existing components and continuous assessments
        const existingComponents = await tx.markingSchemeComponent.findMany({
          where: { markingSchemeId: id },
          select: { id: true },
        });
        await tx.continuousAssessmentComponent.deleteMany({
          where: {
            continuousAssessment: {
              markingSchemeComponentId: {
                in: existingComponents.map((c) => c.id),
              },
            },
          },
        });
        await tx.continuousAssessment.deleteMany({
          where: {
            markingSchemeComponentId: {
              in: existingComponents.map((c) => c.id),
            },
          },
        });
        await tx.markingSchemeComponent.deleteMany({
          where: { markingSchemeId: id },
        });

        // Create new components
        const components = await Promise.all(
          dto.components.map((comp) =>
            tx.markingSchemeComponent.create({
              data: {
                markingSchemeId: id,
                name: comp.name,
                score: comp.score,
                type: comp.type,
                schoolId: requester.schoolId,
                createdBy: requester.id,
              },
            }),
          ),
        );

        // Create ContinuousAssessment for CA-type components
        const continuousAssessments = await Promise.all(
          components
            .filter((comp) => comp.type === AssessmentType.CA)
            .map((comp) =>
              tx.continuousAssessment.create({
                data: {
                  markingSchemeComponentId: comp.id,
                  schoolId: requester.schoolId,
                  createdBy: requester.id,
                },
              }),
            ),
        );

        return { updatedMarkingScheme, components, continuousAssessments };
      });

      // Log action
      await this.loggingService.logAction(
        'update_marking_scheme',
        'MarkingScheme',
        id,
        requester.id,
        requester.schoolId,
        {
          oldName: markingScheme.name,
          newName: dto.name,
          components: dto.components,
        },
        req,
      );

      return await this.getMarkingScheme(id);
    } catch (error) {
      console.error('Error updating marking scheme:', error);
      throw new Error(
        'Failed to update marking scheme: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // Delete Marking Scheme
  async deleteMarkingScheme(id: string, req: any) {
    const requester = req.user;

    try {
      // Validate marking scheme
      const markingScheme = await this.prisma.markingScheme.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!markingScheme) {
        throw new NotFoundException('Marking scheme not found');
      }

      // Soft delete marking scheme and related records in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Soft delete marking scheme
        await tx.markingScheme.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });

        // Soft delete components
        await tx.markingSchemeComponent.updateMany({
          where: { markingSchemeId: id, schoolId: requester.schoolId },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });

        // Soft delete continuous assessments and their components
        const components = await tx.markingSchemeComponent.findMany({
          where: { markingSchemeId: id },
          select: { id: true },
        });
        await tx.continuousAssessmentComponent.updateMany({
          where: {
            continuousAssessment: {
              markingSchemeComponentId: { in: components.map((c) => c.id) },
            },
          },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });
        await tx.continuousAssessment.updateMany({
          where: {
            markingSchemeComponentId: { in: components.map((c) => c.id) },
          },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });

        // Soft delete class-term assignments
        await tx.classTermMarkingSchemeAssignment.updateMany({
          where: { markingSchemeId: id, schoolId: requester.schoolId },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });
      });

      // Log action
      await this.loggingService.logAction(
        'delete_marking_scheme',
        'MarkingScheme',
        id,
        requester.id,
        requester.schoolId,
        { name: markingScheme.name },
        req,
      );

      return {
        statusCode: 200,
        message: 'Marking scheme deleted successfully',
        data: { id },
      };
    } catch (error) {
      console.error('Error deleting marking scheme:', error);
      throw new Error(
        'Failed to delete marking scheme: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // Get Marking Scheme by ID
  async getMarkingScheme(id: string) {
    try {
      const markingScheme = await this.prisma.markingScheme.findUnique({
        where: { id, isDeleted: false },
        include: {
          components: {
            where: { isDeleted: false },
            include: {
              continuousAssessments: {
                where: { isDeleted: false },
                include: {
                  components: { where: { isDeleted: false } },
                },
              },
            },
          },
          classAssignments: {
            where: { isDeleted: false },
            include: {
              class: { select: { id: true, name: true } },
              termDefinition: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!markingScheme) {
        throw new NotFoundException('Marking scheme not found');
      }

      return {
        statusCode: 200,
        message: 'Marking scheme retrieved successfully',
        data: {
          id: markingScheme.id,
          name: markingScheme.name,
          components: markingScheme.components.map((comp) => ({
            id: comp.id,
            name: comp.name,
            score: comp.score,
            type: comp.type,
            subComponents:
              comp.continuousAssessments[0]?.components.map((sub) => ({
                id: sub.id,
                name: sub.name,
                score: sub.score,
              })) || [],
          })),
          assignments: markingScheme.classAssignments.map((a) => ({
            classId: a.class.id,
            className: a.class.name,
            termDefinitionId: a.termDefinition.id,
            termDefinitionName: a.termDefinition.name,
          })),
        },
      };
    } catch (error) {
      console.error('Error fetching marking scheme:', error);
      throw new Error(
        'Failed to fetch marking scheme: ' + (error.message || 'Unknown error'),
      );
    }
  }

  // Existing methods (createMarkingScheme, updateContinuousAssessmentComponents)
  async createMarkingScheme(data: {
    name: string;
    schoolId: string;
    components: { name: string; score: number; type: AssessmentType }[];
    createdBy: string;
  }) {
    // Validate total score
    const totalScore = data.components.reduce(
      (sum, comp) => sum + comp.score,
      0,
    );
    if (totalScore !== 100) {
      throw new BadRequestException('Total score of components must be 100');
    }

    // Create MarkingScheme
    const markingScheme = await this.prisma.markingScheme.create({
      data: {
        name: data.name,
        schoolId: data.schoolId,
        createdBy: data.createdBy,
      },
    });

    // Create MarkingSchemeComponents
    const components = await this.prisma.$transaction(
      data.components.map((comp) =>
        this.prisma.markingSchemeComponent.create({
          data: {
            markingSchemeId: markingScheme.id,
            name: comp.name,
            score: comp.score,
            type: comp.type,
            schoolId: data.schoolId,
            createdBy: data.createdBy,
          },
        }),
      ),
    );

    // Create ContinuousAssessment for CA-type components
    await this.prisma.$transaction(
      components
        .filter((comp) => comp.type === AssessmentType.CA)
        .map((comp) =>
          this.prisma.continuousAssessment.create({
            data: {
              markingSchemeComponentId: comp.id,
              schoolId: data.schoolId,
              createdBy: data.createdBy,
            },
          }),
        ),
    );

    return this.getMarkingScheme(markingScheme.id);
  }

  async updateContinuousAssessmentComponents(data: {
    continuousAssessmentId: string;
    components: { name: string; score: number }[];
    updatedBy: string;
  }) {
    const ca = await this.prisma.continuousAssessment.findUnique({
      where: { id: data.continuousAssessmentId },
      include: { markingSchemeComponent: true },
    });
    if (!ca) throw new BadRequestException('Continuous Assessment not found');

    const totalScore = data.components.reduce(
      (sum, comp) => sum + comp.score,
      0,
    );
    if (totalScore !== ca.markingSchemeComponent.score) {
      throw new BadRequestException(
        `Total score of components must equal ${ca.markingSchemeComponent.score}`,
      );
    }

    // Delete existing components
    await this.prisma.continuousAssessmentComponent.deleteMany({
      where: { continuousAssessmentId: data.continuousAssessmentId },
    });

    // Create new components
    const components = await this.prisma.$transaction(
      data.components.map((comp) =>
        this.prisma.continuousAssessmentComponent.create({
          data: {
            continuousAssessmentId: data.continuousAssessmentId,
            name: comp.name,
            score: comp.score,
            schoolId: ca.schoolId,
            createdBy: data.updatedBy,
          },
        }),
      ),
    );

    return components;
  }

  // Create Grading System and Grades
  async createGradingSystem(dto: CreateGradingSystemDto, req: any) {
    const requester = req.user;

    try {
      // Validate school
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
      });
      if (!school) {
        throw new NotFoundException('School not found');
      }

      // Validate grading system name
      const existingGradingSystem = await this.prisma.gradingSystem.findFirst({
        where: {
          name: dto.name,
          schoolId: requester.schoolId,
          isDeleted: false,
        },
      });
      if (existingGradingSystem) {
        throw new BadRequestException('Grading system name already exists');
      }

      // Validate grades
      if (!dto.grades || dto.grades.length === 0) {
        throw new BadRequestException('At least one grade is required');
      }
      for (const grade of dto.grades) {
        if (grade.scoreStartPoint > grade.scoreEndPoint) {
          throw new BadRequestException(
            `Grade ${grade.name}: scoreStartPoint must be less than or equal to scoreEndPoint`,
          );
        }
      }

      // Create grading system and grades in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        const gradingSystem = await tx.gradingSystem.create({
          data: {
            name: dto.name,
            schoolId: requester.schoolId,
            createdBy: requester.id,
          },
        });

        const grades = await Promise.all(
          dto.grades.map((grade) =>
            tx.grade.create({
              data: {
                name: grade.name,
                scoreStartPoint: grade.scoreStartPoint,
                scoreEndPoint: grade.scoreEndPoint,
                remark: grade.remark,
                teacherComment: grade.teacherComment,
                principalComment: grade.principalComment,
                gradingSystemId: gradingSystem.id,
                schoolId: requester.schoolId,
                createdBy: requester.id,
              },
            }),
          ),
        );

        return { gradingSystem, grades };
      });

      // Log action
      await this.loggingService.logAction(
        'create_grading_system',
        'GradingSystem',
        result.gradingSystem.id,
        requester.id,
        requester.schoolId,
        { name: dto.name, grades: dto.grades },
        req,
      );

      return {
        statusCode: 201,
        message: 'Grading system created successfully',
        data: {
          id: result.gradingSystem.id,
          name: result.gradingSystem.name,
          grades: result.grades.map((grade) => ({
            id: grade.id,
            name: grade.name,
            scoreStartPoint: grade.scoreStartPoint,
            scoreEndPoint: grade.scoreEndPoint,
            remark: grade.remark,
            teacherComment: grade.teacherComment,
            principalComment: grade.principalComment,
          })),
        },
      };
    } catch (error) {
      console.error('Error creating grading system:', error);
      throw new Error(
        'Failed to create grading system: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // Assign Grading System to Classes
  async assignGradingSystemToClasses(
    id: string,
    dto: AssignClassesDto,
    req: any,
  ) {
    const requester = req.user;

    try {
      // Validate grading system
      const gradingSystem = await this.prisma.gradingSystem.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
      });
      if (!gradingSystem) {
        throw new NotFoundException('Grading system not found');
      }

      // Validate classes
      if (!dto.classIds || dto.classIds.length === 0) {
        throw new BadRequestException('At least one class ID is required');
      }
      const classes = await this.prisma.class.findMany({
        where: {
          id: { in: dto.classIds },
          schoolId: requester.schoolId,
          isDeleted: false,
        },
      });
      if (classes.length !== dto.classIds.length) {
        throw new BadRequestException('One or more class IDs are invalid');
      }

      // Update class assignments in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Clear existing assignments
        await tx.classGradingSystem.deleteMany({
          where: { gradingSystemId: id, schoolId: requester.schoolId },
        });

        // Create new assignments
        const assignments = await Promise.all(
          dto.classIds.map((classId) =>
            tx.classGradingSystem.create({
              data: {
                gradingSystemId: id,
                classId,
                schoolId: requester.schoolId,
                createdBy: requester.id,
              },
            }),
          ),
        );

        return assignments;
      });

      // Log action
      await this.loggingService.logAction(
        'assign_grading_system_classes',
        'GradingSystem',
        id,
        requester.id,
        requester.schoolId,
        { classIds: dto.classIds },
        req,
      );

      return {
        statusCode: 200,
        message: 'Classes assigned to grading system successfully',
        data: {
          gradingSystemId: id,
          assignedClassIds: result.map((assignment) => assignment.classId),
        },
      };
    } catch (error) {
      console.error('Error assigning classes:', error);
      throw new Error(
        'Failed to assign classes: ' + (error.message || 'Unknown error'),
      );
    }
  }

  // Fetch Grading System, Grades, and Assigned Classes
  async getGradingSystem(id: string, req: any) {
    const requester = req.user;

    try {
      // Fetch grading system with grades and class assignments
      const gradingSystem = await this.prisma.gradingSystem.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        include: {
          grades: {
            where: { isDeleted: false },
            orderBy: { scoreEndPoint: 'desc' },
          },
          classAssignments: {
            where: { isDeleted: false },
            include: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });

      if (!gradingSystem) {
        throw new NotFoundException('Grading system not found');
      }

      return {
        statusCode: 200,
        message: 'Grading system retrieved successfully',
        data: {
          id: gradingSystem.id,
          name: gradingSystem.name,
          grades: gradingSystem.grades.map((grade) => ({
            id: grade.id,
            name: grade.name,
            scoreStartPoint: grade.scoreStartPoint,
            scoreEndPoint: grade.scoreEndPoint,
            remark: grade.remark,
            teacherComment: grade.teacherComment,
            principalComment: grade.principalComment,
          })),
          assignedClasses: gradingSystem.classAssignments.map((assignment) => ({
            classId: assignment.class.id,
            className: assignment.class.name,
          })),
        },
      };
    } catch (error) {
      console.error('Error fetching grading system:', error);
      throw new Error(
        'Failed to fetch grading system: ' + (error.message || 'Unknown error'),
      );
    }
  }

  // Edit Grading System and Grades
  async updateGradingSystem(id: string, dto: CreateGradingSystemDto, req: any) {
    const requester = req.user;

    try {
      // Validate grading system
      const gradingSystem = await this.prisma.gradingSystem.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
      });
      if (!gradingSystem) {
        throw new NotFoundException('Grading system not found');
      }

      // Validate grading system name
      const existingGradingSystem = await this.prisma.gradingSystem.findFirst({
        where: {
          name: dto.name,
          schoolId: requester.schoolId,
          isDeleted: false,
          NOT: { id },
        },
      });
      if (existingGradingSystem) {
        throw new BadRequestException('Grading system name already exists');
      }

      // Validate grades
      if (!dto.grades || dto.grades.length === 0) {
        throw new BadRequestException('At least one grade is required');
      }
      for (const grade of dto.grades) {
        if (grade.scoreStartPoint > grade.scoreEndPoint) {
          throw new BadRequestException(
            `Grade ${grade.name}: scoreStartPoint must be less than or equal to scoreEndPoint`,
          );
        }
      }

      // Update grading system and grades in a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Update grading system
        const updatedGradingSystem = await tx.gradingSystem.update({
          where: { id },
          data: {
            name: dto.name,
            updatedBy: requester.id,
          },
        });

        // Delete existing grades
        await tx.grade.deleteMany({
          where: { gradingSystemId: id, schoolId: requester.schoolId },
        });

        // Create new grades
        const updatedGrades = await Promise.all(
          dto.grades.map((grade) =>
            tx.grade.create({
              data: {
                name: grade.name,
                scoreStartPoint: grade.scoreStartPoint,
                scoreEndPoint: grade.scoreEndPoint,
                remark: grade.remark,
                teacherComment: grade.teacherComment,
                principalComment: grade.principalComment,
                gradingSystemId: id,
                schoolId: requester.schoolId,
                createdBy: requester.id,
              },
            }),
          ),
        );

        return { updatedGradingSystem, updatedGrades };
      });

      // Log action
      await this.loggingService.logAction(
        'update_grading_system',
        'GradingSystem',
        id,
        requester.id,
        requester.schoolId,
        { oldName: gradingSystem.name, newName: dto.name, grades: dto.grades },
        req,
      );

      return {
        statusCode: 200,
        message: 'Grading system updated successfully',
        data: {
          id: result.updatedGradingSystem.id,
          name: result.updatedGradingSystem.name,
          grades: result.updatedGrades.map((grade) => ({
            id: grade.id,
            name: grade.name,
            scoreStartPoint: grade.scoreStartPoint,
            scoreEndPoint: grade.scoreEndPoint,
            remark: grade.remark,
            teacherComment: grade.teacherComment,
            principalComment: grade.principalComment,
          })),
        },
      };
    } catch (error) {
      console.error('Error updating grading system:', error);
      throw new Error(
        'Failed to update grading system: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // Delete Grading System and Associated Records
  async deleteGradingSystem(id: string, req: any) {
    const requester = req.user;

    try {
      // Validate grading system
      const gradingSystem = await this.prisma.gradingSystem.findUnique({
        where: { id, schoolId: requester.schoolId, isDeleted: false },
        select: { id: true, name: true },
      });
      if (!gradingSystem) {
        throw new NotFoundException('Grading system not found');
      }

      // Soft delete grading system, grades, and class assignments in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Soft delete grading system
        await tx.gradingSystem.update({
          where: { id },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });

        // Soft delete associated grades
        await tx.grade.updateMany({
          where: { gradingSystemId: id, schoolId: requester.schoolId },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });

        // Soft delete associated class assignments
        await tx.classGradingSystem.updateMany({
          where: { gradingSystemId: id, schoolId: requester.schoolId },
          data: {
            isDeleted: true,
            updatedBy: requester.id,
            updatedAt: new Date(),
          },
        });
      });

      // Log action
      await this.loggingService.logAction(
        'delete_grading_system',
        'GradingSystem',
        id,
        requester.id,
        requester.schoolId,
        { name: gradingSystem.name },
        req,
      );

      return {
        statusCode: 200,
        message: 'Grading system and associated records deleted successfully',
        data: { id },
      };
    } catch (error) {
      console.error('Error deleting grading system:', error);
      throw new Error(
        'Failed to delete grading system: ' +
          (error.message || 'Unknown error'),
      );
    }
  }

  // get terms
  async getTerms(req: any) {
    const user = req.user as AuthenticatedUser;

    if (!user.schoolId) {
      throw new NotFoundException('User must be associated with a school');
    }

    try {
      const terms = await this.prisma.termDefinition.findMany({
        where: { schoolId: user.schoolId },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      });

      return {
        statusCode: 200,
        message: 'Terms retrieved successfully',
        data: terms,
      };
    } catch (error) {
      console.error('Error fetching terms:', error);
      throw new HttpException('Failed to fetch terms', 500);
    }
  }

  // get all marking schemes
  async getAllMarkingSchemes(req: any) {
    const user = req.user as AuthenticatedUser;

    if (!user.schoolId) {
      throw new NotFoundException('User must be associated with a school');
    }

    try {
      const markingSchemes = await this.prisma.markingScheme.findMany({
        where: { schoolId: user.schoolId, isDeleted: false },
        orderBy: { name: 'asc' },
        include: {
          components: {
            where: { isDeleted: false },
            include: {
              continuousAssessments: {
                where: { isDeleted: false },
                include: {
                  components: { where: { isDeleted: false } },
                },
              },
            },
          },
          classAssignments: {
            where: { isDeleted: false },
            include: {
              class: { select: { id: true, name: true } },
              termDefinition: { select: { id: true, name: true } },
            },
          },
        },
      });

      return {
        statusCode: 200,
        message: 'Marking schemes retrieved successfully',
        data: markingSchemes,
      };
    } catch (error) {
      console.error('Error fetching marking schemes:', error);
      throw new HttpException('Failed to fetch marking schemes', 500);
    }
  }

  // get all grading systems
  async getAllGradingSystems(req: any) {
    const user = req.user as AuthenticatedUser;

    if (!user.schoolId) {
      throw new NotFoundException('User must be associated with a school');
    }

    try {
      const gradingSystems = await this.prisma.gradingSystem.findMany({
        where: { schoolId: user.schoolId, isDeleted: false },
        orderBy: { name: 'asc' },
        include: {
          grades: {
            where: { isDeleted: false },
            orderBy: { scoreEndPoint: 'desc' },
          },
          classAssignments: {
            where: { isDeleted: false },
            include: {
              class: { select: { id: true, name: true } },
            },
          },
        },
      });

      return {
        statusCode: 200,
        message: 'Grading systems retrieved successfully',
        data: gradingSystems,
      };
    } catch (error) {
      console.error('Error fetching grading systems:', error);
      throw new HttpException('Failed to fetch grading systems', 500);
    }
  }

  async createReportSetting(dto: any, req:any){
    const schoolId = req.user.schoolId;
    const userId = req.user.id;
    const {classId, padding, headerFont, subjectFont, valueFont, classTeacherCompute, showAge, showPosition, showNextFee} = dto;
    try {
      const reportSetting = await this.prisma.reportSheetSetting.create({
        data: {
          schoolId,
          classId,
          padding,
          headerFont,
          subjectFont,
          valueFont,
          classTeacherCompute: classTeacherCompute ? true : false,
          showAge: showAge ? true : false,
          showPosition: showPosition ? true : false,
          showNextFee: showNextFee ? true : false,
          createdBy: userId
        },
      });

      return {
        statusCode: 200,
        message: 'Report setting created successfully',
        data: reportSetting,
    }
  }catch(error){
    throw new HttpException('Failed to create report setting', 500);
  }
  }

  async getReportSetting(req:any){
    const schoolId = req.user.schoolId;
    try {
      const reportSetting = await this.prisma.reportSheetSetting.findFirst({
        where: {
          schoolId,
        },
      });

      return {
        statusCode: 200,
        message: 'Report setting retrieved successfully',
        data: reportSetting,
    }
  }catch(error){
    throw new HttpException('Failed to retrieve report setting', 500);
  }
  }
 
}
