import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthenticatedUser } from '@/types/express';
import * as bcrypt from 'bcrypt';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/school.dto';
import { generateRandomPassword, generateUniqueUsername } from '@/utils/';

import { LoggingService } from '@/log/logging.service';
import { Prisma } from '@prisma/client';
import slugify from 'slugify';

@Injectable()
export class SchoolsService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async getSchools({
    search,
    page = 1,
    limit = 5,
  }: {
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const where = search
      ? {
          OR: [{ name: { contains: search } }, { email: { contains: search } }],
        }
      : {};

    const [schools, total] = await Promise.all([
      this.prisma.school.findMany({
        where: {
          ...where,
          isDeleted: false,
        },
        take: limit,
        skip: (page - 1) * limit,
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          subscriptionId: true,
          subscriptionExpiresAt: true,
          subscriptionStatus: true,
          configuration: {
            select: {
              id: true,
              logo: true,
              country: true,
              state: true,
              color: true,
              schoolHeadName: true,
              schoolHeadContact: true,
              schoolHeadSignature: true,
              principalName: true,
              principalContact: true,
              principalSignature: true,
              bursarName: true,
              bursarContact: true,
              bursarSignature: true,
              createdAt: true,
              updatedAt: true,
            },
          }, // ← pointer to the Subscription plan
          subscription: {
            select: {
              name: true,
              id: true,
            },
          },
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { schools, total, page, limit };
  }

  async getSchoolById(id: string) {
    const school = await this.prisma.school.findFirst({
      where: {
        OR: [
          { id },
          { slug: id }, // Assuming 'id' parameter could be a slug
        ],
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        email: true,
        contact: true,
        isActive: true,
        address: true,
        createdAt: true,
        updatedAt: true,
        subscriptionId: true,
        subscriptionStatus: true,
        subscriptionExpiresAt: true,
        configuration: {
          select: {
            id: true,
            logo: true,
            country: true,
            state: true,
            color: true,
            schoolHeadName: true,
            schoolHeadContact: true,
            schoolHeadSignature: true,
            principalName: true,
            principalContact: true,
            principalSignature: true,
            bursarName: true,
            bursarContact: true,
            bursarSignature: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        subscription: {
          select: {
            id: true,
            name: true,
            duration: true,
          },
        },
      },
    });

    if (!school) {
      throw new NotFoundException('School not found');
    }
    return school;
  }

  async createSchool(dto: CreateSchoolDto, req: any) {
    try {
      const requester = req.user;
      if (requester.role !== 'superAdmin') {
        throw new ForbiddenException('Only superAdmin can create schools');
      }

      // Find Admin subrole
      const adminSubRole = await this.prisma.subRole.findFirst({
        where: { name: 'admin', isGlobal: true },
      });
      if (!adminSubRole) {
        throw new ForbiddenException('Admin subrole not found');
      }

      // generate slug usig the school name iwth slugify
      // Import slugify

      // Generate slug from school name
      const slug = slugify(dto.name, { lower: true, strict: true });

      // Check if slug already exists (to ensure uniqueness)
      const existingSchool = await this.prisma.school.findFirst({
        where: { slug },
      });

      // If slug already exists, make it unique by adding a timestamp
      const finalSlug = existingSchool
        ? `${slug}-${Date.now().toString().slice(-6)}`
        : slug;

      // Generate admin user details
      const adminPassword = generateRandomPassword();
      const adminUsername = await generateUniqueUsername(dto.name);
      const hashedPassword = await bcrypt.hash(adminPassword, 10); // Precompute hash

      // Run transaction for school and user creation
      const { school } = await this.prisma.$transaction(
        async (tx) => {
          // Create school
          const school = await tx.school.create({
            data: {
              name: dto.name,
              email: dto.email,
              slug: finalSlug,
              contact: dto.contact,
              address: dto.address,
              createdBy: requester.id,
            },
            select: {
              id: true,
              name: true,
              email: true,
              slug: true,
              contact: true,
              isActive: true,
              address: true,
              createdAt: true,
              updatedAt: true,
              subscriptionId: true,
            },
          });

          // Create admin user
          const adminUser = await tx.user.create({
            data: {
              firstname: 'Admin',
              lastname: 'User',
              username: adminUsername,
              email: dto.email,
              password: hashedPassword,
              plainPassword: adminPassword,
              schoolId: school.id,
              schoolSlug: school.slug,
              subRoleId: adminSubRole.id,
              createdBy: requester.id,
            },
          });

          return { school, adminUser };
        },
        { timeout: 10000 }, // Increase timeout to 10s
      );

      // create recode in configuration model
      await this.prisma.configuration.create({
        data: {
          schoolId: school.id,
          logo: { imageUrl: '', pubId: '' }, // Placeholder, can be updated later
          country: '',
          state: '',
          color: '#3F51B5',
          schoolHeadName: '',
          schoolHeadContact: '',
          schoolHeadSignature: { imageUrl: '', pubId: '' },
          principalName: '',
          principalContact: '',
          principalSignature: { imageUrl: '', pubId: '' },
          bursarName: '',
          bursarContact: '',
          bursarSignature: { imageUrl: '', pubId: '' },
        },
      });

      // Log action after transaction
      await this.loggingService.logAction(
        'create_school',
        'School',
        school.id,
        requester.id,
        school.id,
        { name: school.name },
        req,
      );

      return { school, adminPassword };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Contact number already in use by another school',
        );
      }
      console.error('Error creating school:', error);
      throw error instanceof ForbiddenException ||
        error instanceof ConflictException
        ? error
        : new Error(`Failed to create school: ${error.message}`);
    }
  }

  async updateSchool(
    id: string,
    dto: UpdateSchoolDto,
    requester: AuthenticatedUser,
  ) {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can update schools');
    }

    const currentSchool = await this.prisma.school.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        address: true,
      },
    });

    if (!currentSchool) {
      return null;
    }

    const updateData: Partial<UpdateSchoolDto> & {
      updatedBy?: string;
    } = {
      updatedBy: requester.id,
    };

    // Handle text fields
    if (dto.name && dto.name !== currentSchool.name) {
      updateData.name = dto.name;
    }
    if (dto.email && dto.email !== currentSchool.email) {
      updateData.email = dto.email;
    }
    if (dto.contact && dto.contact !== currentSchool.contact) {
      updateData.contact = dto.contact;
    }
    if (dto.address !== undefined) {
      updateData.address = dto.address;
    }

    // // Handle logo upload to Cloudinary
    // if (file) {
    //   try {
    //     // Create a readable stream from the file buffer
    //     const stream = Readable.from(file.buffer);
    //     const uploadResult: UploadApiResponse = await new Promise(
    //       (resolve, reject) => {
    //         const uploadStream = cloudinary.uploader.upload_stream(
    //           {
    //             folder: 'school_logos',
    //             public_id: `school_${id}_${Date.now()}`,
    //           },
    //           (error, result) => {
    //             if (error) reject(error);
    //             else resolve(result as UploadApiResponse);
    //           },
    //         );
    //         stream.pipe(uploadStream);
    //       },
    //     );

    //     updateData.logo = { url: uploadResult.secure_url };
    //   } catch (error) {
    //     throw new InternalServerErrorException(
    //       'Failed to upload logo to Cloudinary',
    //     );
    //   }
    // }

    // Check for conflicts
    if (updateData.name || updateData.email || updateData.contact) {
      const conflicts = await this.prisma.school.findFirst({
        where: {
          id: { not: id },
          OR: [
            updateData.name ? { name: updateData.name } : undefined,
            updateData.email ? { email: updateData.email } : undefined,
            updateData.contact ? { contact: updateData.contact } : undefined,
          ].filter(Boolean),
        },
        select: { id: true, name: true, email: true, contact: true },
      });

      if (conflicts) {
        const messages = [];
        if (updateData.name && conflicts.name === updateData.name) {
          messages.push(`Name "${updateData.name}" is already taken`);
        }
        if (updateData.email && conflicts.email === updateData.email) {
          messages.push(`Email "${updateData.email}" is already taken`);
        }
        if (updateData.contact && conflicts.contact === updateData.contact) {
          messages.push(`Contact "${updateData.contact}" is already taken`);
        }
        throw new ConflictException(messages.join(', '));
      }
    }

    // If only updatedBy is present and no other changes, return current school
    if (Object.keys(updateData).length === 1 && !updateData.logo) {
      return this.prisma.school.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          subscriptionId: true,
        },
      });
    }

    try {
      return await this.prisma.school.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          subscriptionId: true,
        },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        return null;
      }
      throw new ForbiddenException('Failed to update school');
    }
  }

  async deleteSchool(id: string, requester: AuthenticatedUser): Promise<void> {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can delete schools');
    }
    try {
      // on delete check user model for users associated with this school and delete too using soft delete
      await this.prisma.user.updateMany({
        where: { schoolId: id },
        data: { isDeleted: true },
      });
      // Soft delete the school
      await this.prisma.school.update({
        where: { id },
        data: { isDeleted: true, updatedBy: requester.id },
      });
    } catch (error) {
      if (error.code === 'P2025') {
        throw new NotFoundException('School not found');
      }
      throw new ForbiddenException('Failed to delete school');
    }
  }

  async toggleSchoolActive(id: string, requester: AuthenticatedUser) {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException(
        'Only superAdmin can toggle school active status',
      );
    }
    const school = await this.prisma.school.findUnique({ where: { id } });
    if (!school) {
      return null;
    }
    try {
      return await this.prisma.school.update({
        where: { id },
        data: { isActive: !school.isActive, updatedBy: requester.id },
        select: {
          id: true,
          name: true,
          email: true,
          contact: true,
          isActive: true,
          address: true,
          createdAt: true,
          updatedAt: true,
          subscriptionId: true,
        },
      });
    } catch (error) {
      throw new ForbiddenException('Failed to toggle school active status');
    }
  }

  async getSchoolClassStatistics(schoolId) {
    // Define the class names to filter
    const classNames = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];

    const classArms = await this.prisma.classArm.findMany({
      where: { schoolId: schoolId },
      select: {
        id: true,
        name: true,
      },
    });
    // Fetch the statistics
    const classStats = await this.prisma.class.findMany({
      where: {
        schoolId: schoolId,
        name: {
          in: classNames,
        },
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        // Count class arms associated with this class
        // Aggregate student data
        students: {
          where: {
            user: {
              isDeleted: false,
              subRole: {
                name: 'Student',
                isGlobal: true,
              },
            },
          },
          select: {
            id: true,
            user: {
              select: {
                gender: true,
              },
            },
          },
        },
      },
    });

    // Process the data to format the statistics
    const result = classStats.map((classItem) => {
      // const totalClassArms = classItem.length;
      const totalStudents = classItem.students.length;
      const totalMale = classItem.students.filter(
        (student) => student.user.gender === 'male',
      ).length;
      const totalFemale = classItem.students.filter(
        (student) => student.user.gender === 'female',
      ).length;

      const totalClassArms = classArms.filter(
        (classArm) => classArm.name === classItem.name,
      ).length;

      return {
        className: classItem.name,
        totalClassArms,
        totalStudents,
        totalMale,
        totalFemale,
      };
    });

    return result;
  }
}
