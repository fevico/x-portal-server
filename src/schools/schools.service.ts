import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path
import { AuthenticatedUser } from '@/types/express';
import * as bcrypt from 'bcrypt';
import { CreateSchoolDto, UpdateSchoolDto } from './dto/school.dto';
import { generateRandomPassword } from '@/types/utils';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { ConfigService } from '@nestjs/config';


@Injectable()
export class SchoolsService {
  constructor(private prisma: PrismaService) {}

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
        where,
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
          logo: true,
        },
      }),
      this.prisma.school.count({ where }),
    ]);

    return { schools, total, page, limit };
  }

  async getSchoolById(id: string) {
    const school = await this.prisma.school.findUnique({
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
        logo: true,
      },
    });
    return school;
  }

  async createSchool(dto: CreateSchoolDto, requester: AuthenticatedUser) {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can create schools');
    }

    // Generate username for admin user
    const generateUniqueUsername = async (base: string): Promise<string> => {
      const cleanBase = base
        .toLowerCase()
        .replace(/[^a-z0-9]/g, '')
        .slice(0, 10);
      let username = `admin_${cleanBase}`;
      const getRandomNumber = () => Math.floor(Math.random() * 900) + 100;
      username = `${username}${getRandomNumber()}`;
      let attempts = 0;
      const maxAttempts = 10;
      while (await this.prisma.user.findUnique({ where: { username } })) {
        if (attempts >= maxAttempts) {
          throw new ForbiddenException('Unable to generate a unique username');
        }
        username = `${cleanBase}${getRandomNumber()}`;
        attempts++;
      }
      return username;
    };

    // Find Admin subrole
    const adminSubRole = await this.prisma.subRole.findFirst({
      where: { name: 'Admin', isGlobal: true },
    });
    if (!adminSubRole) {
      throw new ForbiddenException('Admin subrole not found');
    }

    // Generate admin user details
    const adminPassword = generateRandomPassword();
    const adminUsername = await generateUniqueUsername(dto.name);

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Create school
        const school = await tx.school.create({
          data: {
            name: dto.name,
            email: dto.email,
            contact: dto.contact,
            address: dto.address,
            createdBy: requester.id,
          },
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
            logo: true,
          },
        });

        // Create admin user
        const hashedPassword = await bcrypt.hash(adminPassword, 10);
        await tx.user.create({
          data: {
            username: adminUsername,
            email: dto.email, // Use school email
            password: hashedPassword,
            plainPassword: adminPassword,
            schoolId: school.id,
            subRoleId: adminSubRole.id,
            createdBy: requester.id,
          },
        });

        return { school, adminPassword }; // Return password for superAdmin
      });
    } catch (error) {
      if (error.code === 'P2002') {
        throw new ConflictException(
          'School name, email, or contact already exists',
        );
      }
      throw new ForbiddenException('Failed to create school');
    }
  }

  // async updateSchool(id: string, dto: UpdateSchoolDto, requester: AuthenticatedUser, file?: Express.Multer.File) {
  //   if (requester.role !== 'superAdmin') {
  //     throw new ForbiddenException('Only superAdmin can update schools');
  //   }

  //   const currentSchool = await this.prisma.school.findUnique({
  //     where: { id },
  //     select: { id: true, name: true, email: true, contact: true, logo: true },
  //   });

  //   if (!currentSchool) {
  //     return null;
  //   }

  //   const updateData: Partial<UpdateSchoolDto> & { updatedBy?: string; logo?: any } = {
  //     updatedBy: requester.id,
  //   };

  //   // Handle text fields
  //   if (dto.name && dto.name !== currentSchool.name) {
  //     updateData.name = dto.name;
  //   }
  //   if (dto.email && dto.email !== currentSchool.email) {
  //     updateData.email = dto.email;
  //   }
  //   if (dto.contact && dto.contact !== currentSchool.contact) {
  //     updateData.contact = dto.contact;
  //   }
  //   if (dto.address !== undefined) {
  //     updateData.address = dto.address;
  //   }

  //   // Handle logo upload to Cloudinary
  //   if (file) {
  //     try {
  //       // Create a readable stream from the file buffer
  //       const stream = Readable.from(file.buffer);
  //       const uploadResult = await new Promise((resolve, reject) => {
  //         const uploadStream = cloudinary.uploader.upload_stream(
  //           {
  //             folder: 'school_logos',
  //             public_id: `school_${id}_${Date.now()}`,
  //           },
  //           (error, result) => {
  //             if (error) reject(error);
  //             else resolve(result);
  //           },
  //         );
  //         stream.pipe(uploadStream);
  //       });

  //       updateData.logo = { url: uploadResult.secure_url };
  //     } catch (error) {
  //       throw new InternalServerErrorException('Failed to upload logo to Cloudinary');
  //     }
  //   }

  //   // Check for conflicts
  //   if (updateData.name || updateData.email || updateData.contact) {
  //     const conflicts = await this.prisma.school.findFirst({
  //       where: {
  //         id: { not: id },
  //         OR: [
  //           updateData.name ? { name: updateData.name } : undefined,
  //           updateData.email ? { email: updateData.email } : undefined,
  //           updateData.contact ? { contact: updateData.contact } : undefined,
  //         ].filter(Boolean),
  //       },
  //       select: { id: true, name: true, email: true, contact: true },
  //     });

  //     if (conflicts) {
  //       const messages = [];
  //       if (updateData.name && conflicts.name === updateData.name) {
  //         messages.push(`Name "${updateData.name}" is already taken`);
  //       }
  //       if (updateData.email && conflicts.email === updateData.email) {
  //         messages.push(`Email "${updateData.email}" is already taken`);
  //       }
  //       if (updateData.contact && conflicts.contact === updateData.contact) {
  //         messages.push(`Contact "${updateData.contact}" is already taken`);
  //       }
  //       throw new ConflictException(messages.join(', '));
  //     }
  //   }

  //   // If only updatedBy is present and no other changes, return current school
  //   if (Object.keys(updateData).length === 1 && !updateData.logo) {
  //     return this.prisma.school.findUnique({
  //       where: { id },
  //       select: {
  //         id: true,
  //         name: true,
  //         email: true,
  //         contact: true,
  //         isActive: true,
  //         address: true,
  //         createdAt: true,
  //         updatedAt: true,
  //         subscriptionId: true,
  //         logo: true,
  //       },
  //     });
  //   }

  //   try {
  //     return await this.prisma.school.update({
  //       where: { id },
  //       data: updateData,
  //       select: {
  //         id: true,
  //         name: true,
  //         email: true,
  //         contact: true,
  //         isActive: true,
  //         address: true,
  //         createdAt: true,
  //         updatedAt: true,
  //         subscriptionId: true,
  //         logo: true,
  //       },
  //     });
  //   } catch (error) {
  //     if (error.code === 'P2025') {
  //       return null;
  //     }
  //     throw new ForbiddenException('Failed to update school');
  //   }
  // }

  async updateSchool(id: string, dto: UpdateSchoolDto, requester: AuthenticatedUser, file?: Express.Multer.File) {
    if (requester.role !== 'superAdmin') {
      throw new ForbiddenException('Only superAdmin can update schools');
    }

    const currentSchool = await this.prisma.school.findUnique({
      where: { id },
      select: { id: true, name: true, email: true, contact: true, logo: true },
    });

    if (!currentSchool) {
      return null;
    }

    const updateData: Partial<UpdateSchoolDto> & { updatedBy?: string; logo?: any } = {
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

    // Handle logo upload to Cloudinary
    if (file) {
      try {
        // Create a readable stream from the file buffer
        const stream = Readable.from(file.buffer);
        const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: 'school_logos',
              public_id: `school_${id}_${Date.now()}`,
            },
            (error, result) => {
              if (error) reject(error);
              else resolve(result as UploadApiResponse);
            },
          );
          stream.pipe(uploadStream);
        });

        updateData.logo = { url: uploadResult.secure_url };
      } catch (error) {
        throw new InternalServerErrorException('Failed to upload logo to Cloudinary');
      }
    }

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
          logo: true,
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
          logo: true,
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
      await this.prisma.school.update({
        where: { id },
        data: { isActive: false, updatedBy: requester.id },
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
          logo: true,
        },
      });
    } catch (error) {
      throw new ForbiddenException('Failed to toggle school active status');
    }
  }

  async  getSchoolClassStatistics(schoolId) {
    // Define the class names to filter
    const classNames = ['JSS1', 'JSS2', 'JSS3', 'SS1', 'SS2', 'SS3'];
  
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
        classArms: {
          where: {
            isDeleted: false,
          },
          select: {
            id: true,
          },
        },
        // Aggregate student data
        students: {
          where: {
            user: {
              isDeleted: false,
              subRole: {
                name: 'Student',                 isGlobal: true,
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
      const totalClassArms = classItem.classArms.length;
      const totalStudents = classItem.students.length;
      const totalMale = classItem.students.filter(
        (student) => student.user.gender === 'male'
      ).length;
      const totalFemale = classItem.students.filter(
        (student) => student.user.gender === 'female'
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
