import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { Prisma, SubRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GetUsersQueryDto, UpdateUserDto } from './dto/user.dtos';
import { AuthenticatedUser } from '@/types/express';
import { generateRandomPassword } from '@/types/utils';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findByUsernameOrEmail(
    identifier: string,
  ): Promise<(User & { permissions: string[] }) | null> {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identifier }, { username: identifier }],
      },
      include: {
        school: { select: { id: true, name: true } },
        subRole: {
          include: {
            permissions: {
              select: { permission: { select: { name: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      ...user,
      permissions:
        user.subRole?.permissions.map((p) => p.permission.name) || [],
    };
  }

  async findById(
    id: string,
  ): Promise<
    | (User & { permissions: string[]; school?: { id: string; name: string } })
    | null
  > {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id },
        include: {
          school: { select: { id: true, name: true } },
          subRole: {
            include: {
              permissions: {
                select: { permission: { select: { name: true } } },
              },
            },
          },
        },
      });
      if (!user) return null;

      const permissions =
        user.subRole?.permissions.map((p) => p.permission.name) || [];
      return { ...user, permissions };
    } catch (error) {
      throw new ForbiddenException('Failed to retrieve user');
    }
  }

  private async generateUniqueUsername(
    firstname: string,
    lastname: string,
  ): Promise<string> {
    // Normalize firstname and lastname: lowercase, remove spaces, and special characters
    const cleanFirstname = firstname.toLowerCase().replace(/[^a-z0-9]/g, '');
    const firstInitial = cleanFirstname.charAt(0);
    const cleanLastname = lastname.toLowerCase().replace(/[^a-z0-9]/g, '');
    const baseUsername = `${firstInitial}_${cleanLastname}`;
    let username = baseUsername;
    let counter = 1;

    // Check if username exists and append number if necessary
    while (await this.prisma.user.findUnique({ where: { username } })) {
      username = `${baseUsername}${counter}`;
      counter++;
    }

    return username;
  }

  async create(
    data: {
      firstname?: string;
      lastname?: string;
      othername?: string;
      email?: string;
      phone?: string;
      gender?: 'male' | 'female';
      password?: string;
      role?: 'admin' | 'superAdmin';
      classId?: string;
      subRoleId?: string;
      staffId?: string;
      department?: string;
      position?: string;
      studentId?: string;
      classArmId?: string;
      parentId?: string;
      occupation?: string;
      relationship?: string;
    },
    requester: User,
  ): Promise<User> {
    // Validate subRoleId for non-superAdmin users
    let subRole: SubRole | null = null;
    if (data.role !== 'superAdmin') {
      if (!requester.schoolId) {
        throw new ForbiddenException('schoolId is required for users');
      }
      if (!data.subRoleId) {
        throw new ForbiddenException('subRoleId is required for users');
      }
      subRole = await this.prisma.subRole.findUnique({
        where: { id: data.subRoleId },
      });
      if (!subRole) {
        throw new ForbiddenException('SubRole does not exist');
      }

      // For non-global subroles, ensure schoolId is provided and subRole belongs to that school
      if (
        !subRole.isGlobal &&
        (!requester.schoolId || subRole.schoolId !== requester.schoolId)
      ) {
        throw new ForbiddenException(
          'SubRole is not valid for the specified school',
        );
      }
    } else {
      if (requester.role !== 'superAdmin') {
        throw new ForbiddenException('This user Cannot create a superadmin');
      }
      // For superAdmin, subRoleId is optional; fetch it if provided
      if (data.subRoleId) {
        subRole = await this.prisma.subRole.findUnique({
          where: { id: data.subRoleId },
        });
        if (!subRole) {
          throw new ForbiddenException('SubRole does not exist');
        }
      }
    }

    // Validate schoolId if provided
    if (requester.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: requester.schoolId },
      });
      if (!school) {
        throw new ForbiddenException('School does not exist');
      }
    }

    // Restrict requester to their own school unless they are superAdmin

    // Generate unique username
    const username = await this.generateUniqueUsername(
      data.firstname,
      data.lastname,
    );

    // Hash password
    let hashedPassword = '';
    let plainPassword = '';
    if (data.password) {
      hashedPassword = await bcrypt.hash(data.password, 10);
      plainPassword = data.password;
    } else {
      const autoPassword = generateRandomPassword();
      hashedPassword = await bcrypt.hash(autoPassword, 10);
      plainPassword = autoPassword;
    }

    // Create base user
    const userData: Prisma.UserCreateInput = {
      firstname: data.firstname,
      lastname: data.lastname,
      othername: data.othername,
      username,
      email: data.email,
      phone: data.phone,
      gender: data.gender,
      password: hashedPassword,
      plainPassword,
      role: data.role || 'admin',
      school: requester.schoolId
        ? { connect: { id: requester.schoolId } }
        : undefined,
      subRole: data.subRoleId ? { connect: { id: data.subRoleId } } : undefined,
      createdBy: requester.id,
    };

    try {
      const user = await this.prisma.$transaction(async (tx) => {
        // Create User
        const createdUser = await tx.user.create({
          data: userData,
        });

        // Handle global subroles: Staff, Student, Parent (only if subRole is provided)
        if (subRole?.isGlobal) {
          if (subRole.name.toLowerCase() === 'staff') {
            await tx.staff.create({
              data: {
                user: { connect: { id: createdUser.id } },
                staffId: data.staffId,
                department: data.department,
                position: data.position,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'student') {
            await tx.student.create({
              data: {
                user: { connect: { id: createdUser.id } },
                studentId: data.studentId,
                class: data.classId
                  ? { connect: { id: data.classId } }
                  : undefined,
                classArm: data.classArmId
                  ? { connect: { id: data.classArmId } }
                  : undefined,
                parent: data.parentId
                  ? { connect: { id: data.parentId } }
                  : undefined,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'parent') {
            await tx.parent.create({
              data: {
                user: { connect: { id: createdUser.id } },
                occupation: data.occupation,
                relationship: data.relationship,
                createdBy: requester.id,
              },
            });
          }
        }

        return createdUser;
      });

      return user;
    } catch (error) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
        if (error.meta?.target?.includes('phone')) {
          throw new ForbiddenException('Phone number already exists');
        }
      }
      throw new ForbiddenException('Failed to create user');
    }
  }

  async updateSubRole(
    userId: string,
    subRoleId: string,
    requester: User,
  ): Promise<User> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ForbiddenException('User not found');
    if (
      user.schoolId &&
      requester.schoolId &&
      user.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException(
        'Cannot modify user from a different school',
      );
    }
    return this.prisma.user.update({
      where: { id: userId },
      data: { subRoleId },
    });
  }

  async update(
    id: string,
    data: UpdateUserDto,
    requester: User,
  ): Promise<User> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Restrict non-superAdmin to their own school
    if (
      requester.role !== 'superAdmin' &&
      existingUser.schoolId &&
      requester.schoolId &&
      existingUser.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException(
        'Cannot update user from a different school',
      );
    }

    // Validate schoolId if provided
    if (data.schoolId) {
      const school = await this.prisma.school.findUnique({
        where: { id: data.schoolId },
      });
      if (!school) {
        throw new ForbiddenException('School does not exist');
      }
    }

    // Validate subRoleId if provided
    let subRole: SubRole | null = null;
    if (data.subRoleId) {
      subRole = await this.prisma.subRole.findUnique({
        where: { id: data.subRoleId },
      });
      if (!subRole) {
        throw new ForbiddenException('SubRole does not exist');
      }
      if (
        !subRole.isGlobal &&
        (!data.schoolId || subRole.schoolId !== data.schoolId)
      ) {
        throw new ForbiddenException(
          'SubRole is not valid for the specified school',
        );
      }
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // Update User
        const updatedUser = await tx.user.update({
          where: { id },
          data: {
            firstname: data.firstname,
            lastname: data.lastname,
            othername: data.othername,
            email: data.email,
            phone: data.phone,
            gender: data.gender,
            school: data.schoolId
              ? { connect: { id: data.schoolId } }
              : undefined,
            subRole: data.subRoleId
              ? { connect: { id: data.subRoleId } }
              : undefined,
            updatedBy: requester.id,
          },
        });

        // Update related models if provided
        if (subRole?.isGlobal) {
          if (subRole.name.toLowerCase() === 'staff') {
            await tx.staff.upsert({
              where: { userId: id },
              update: {
                staffId: data.staffId,
                department: data.department,
                position: data.position,
                updatedBy: requester.id,
              },
              create: {
                // id: uuidv4(),
                userId: id,
                staffId: data.staffId,
                department: data.department,
                position: data.position,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'student') {
            await tx.student.upsert({
              where: { userId: id },
              update: {
                studentId: data.studentId,
                class: data.classId
                  ? { connect: { id: data.classId } }
                  : undefined,
                classArm: data.classArmId
                  ? { connect: { id: data.classArmId } }
                  : undefined,
                parent: data.parentId
                  ? { connect: { id: data.parentId } }
                  : undefined,
                updatedBy: requester.id,
              },
              create: {
                // id: uuidv4(),
                user: { connect: { id } },
                studentId: data.studentId,
                class: data.classId
                  ? { connect: { id: data.classId } }
                  : undefined,
                classArm: data.classArmId
                  ? { connect: { id: data.classArmId } }
                  : undefined,
                parent: data.parentId
                  ? { connect: { id: data.parentId } }
                  : undefined,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'parent') {
            await tx.parent.upsert({
              where: { userId: id },
              update: {
                occupation: data.occupation,
                relationship: data.relationship,
                updatedBy: requester.id,
              },
              create: {
                // id: uuidv4(),
                userId: id,
                occupation: data.occupation,
                relationship: data.relationship,
                createdBy: requester.id,
              },
            });
          }
        }

        return updatedUser;
      });
    } catch (error) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
        if (error.meta?.target?.includes('phone')) {
          throw new ForbiddenException('Phone number already exists');
        }
      }
      throw new ForbiddenException('Failed to update user');
    }
  }

  async delete(id: string, requester: User): Promise<User> {
    // Check if user exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!existingUser) {
      throw new NotFoundException('User not found');
    }

    // Restrict non-superAdmin to their own school
    if (
      requester.role !== 'superAdmin' &&
      existingUser.schoolId &&
      requester.schoolId &&
      existingUser.schoolId !== requester.schoolId
    ) {
      throw new ForbiddenException(
        'Cannot delete user from a different school',
      );
    }

    // Soft delete by setting isActive to false
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, updatedBy: requester.id },
    });
  }

  async findAll(
    query: GetUsersQueryDto,
    requester: AuthenticatedUser,
  ): Promise<{
    users: User[];
    total: number;
    page: number;
    limit: number;
  }> {
    try {
      const {
        schoolId,
        q,
        gender,
        subRoleId,
        subRoleFlag, // 'student' | 'staff' | 'parent'
        page = 1,
        limit = 10,
      } = query;
      // console.log(page, limit, 'check 0');
      // Convert page and limit to integers
      const pageInt = parseInt(page.toString(), 10);
      const limitInt = parseInt(limit.toString(), 10);

      // Validate page and limit
      if (isNaN(pageInt) || pageInt < 1) {
        throw new BadRequestException('Invalid page number');
      }
      if (isNaN(limitInt) || limitInt < 1) {
        throw new BadRequestException('Invalid limit value');
      }
      // 1. Restrict school access if not superAdmin
      if (
        requester.role !== 'superAdmin' &&
        schoolId &&
        requester.schoolId &&
        schoolId !== requester.schoolId
      ) {
        throw new ForbiddenException(
          'Cannot view users from a different school',
        );
      }
      // console.log(requester.role, schoolId, requester.schoolId, 'check 1');
      // 2. Validate schoolId
      if (schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: schoolId },
        });
        if (!school) {
          throw new ForbiddenException('School does not exist');
        }
        // console.log(school, 'check 2');
      }

      // 3. Validate subRoleId
      if (subRoleId) {
        const subRole = await this.prisma.subRole.findUnique({
          where: { id: subRoleId },
        });
        if (!subRole) {
          throw new ForbiddenException('SubRole does not exist');
        }
        // console.log(subRole, 'check 3');

        if (!subRole.isGlobal && (!schoolId || subRole.schoolId !== schoolId)) {
          throw new ForbiddenException(
            'SubRole is not valid for the specified school',
          );
        }
        // console.log('check 4');
      }

      // 4. Build where clause
      const where: Prisma.UserWhereInput = {
        isActive: true,
        gender: gender || undefined,
        schoolId: schoolId || undefined,
        subRoleId: subRoleId || undefined,
        OR: q
          ? [
              { firstname: { contains: q } },
              { lastname: { contains: q } },
              { email: { contains: q } },
            ]
          : undefined,
      };
      // console.log(where, 'check 5');

      // 5. Add subRoleFlag filter
      if (subRoleFlag === 'student') {
        where.student = { isNot: null };
      } else if (subRoleFlag === 'staff') {
        where.staff = { isNot: null };
      } else if (subRoleFlag === 'parent') {
        where.parent = { isNot: null };
      }
      // console.log('check 6');

      // 6. Fetch with pagination
      const [users, total] = await Promise.all([
        this.prisma.user.findMany({
          where,
          skip: (pageInt - 1) * limitInt,
          take: limitInt,
          orderBy: { createdAt: 'desc' },
          include: {
            student: true,
            staff: true,
            parent: true,
            subRole: true,
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      // console.log(users, 'check 7');

      return {
        users,
        total,
        page,
        limit,
      };
    } catch (error) {
      console.error('Error in findAll:', error);
      throw new ForbiddenException(`Failed to fetch users: ${error.message}`);
    }
  }

  async getTotals(userId: string) {
    // Verify user is Admin
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { subRole: true },
    });

    if (!user || user.subRole.name !== 'admin' || !user.subRole.isGlobal) {
      throw new HttpException(
        'Unauthorized: Admin access required',
        HttpStatus.FORBIDDEN,
      );
    }

    const [totalSchools, totalSubscriptions] = await Promise.all([
      this.prisma.school.count({
        where: { isDeleted: false },
      }),
      this.prisma.subscription.count({
        where: { isDeleted: false, isActive: true },
      }),
    ]);

    const result = {
      totalSchools,
      totalSubscriptions,
    };

    return result;
  }
}
