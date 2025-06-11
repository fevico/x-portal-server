import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '@/prisma/prisma.service';
import { AdmissionStatus, Prisma, SubRole, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { GetUsersQueryDto, UpdateUserDto } from './dto/user.dtos';
import { AuthenticatedUser } from '@/types/express';
import { generateRandomPassword, generateUniqueUsername } from '@/utils/';

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
  // async findById(
  //   id: string,
  // ): Promise<
  //   | (User & { permissions: string[]; school?:  string  })
  //   | null
  // > {
  //   try {
  //     const user = await this.prisma.user.findUnique({
  //       where: { id },
  //       include: {
  //         school: { select: { id: true, name: true, currentSessionId: true, currentSession: { select: { id: true, name: true } }, currentTermId: true, currentTerm: { select: { id: true, name: true } } } },
  //         subRole: {
  //           include: {
  //             permissions: {
  //               select: { permission: { select: { name: true } } },
  //             },
  //           },
  //         },
  //         student: {
  //           include: {
  //             class: true,
  //             classArm: true,
  //             parent: {
  //               include: {
  //                 user: true
  //               }
  //             }
  //           }
  //         },
  //         staff: true,
  //         parent: true,
  //       },
  //     });

  //     if (!user) return null;

  //     const permissions =
  //       user.subRole?.permissions.map((p) => p.permission.name) || [];

  //     // Transform the nested data into a flat structure
  //     const flatUser = {
  //       id: user.id,
  //       firstname: user.firstname,
  //       lastname: user.lastname,
  //       othername: user.othername || '',
  //       email: user.email,
  //       phone: user.phone || '',
  //       gender: user.gender,
  //       username: user.username,
  //       role: user.role,
  //       isActive: user.isActive,
  //       religion: user.religion || '',
  //       nationality: user.nationality || '',
  //       stateOfOrigin: user.stateOfOrigin || '',
  //       lga: user.lga || '',
  //       emailVerifiedAt: user.emailVerifiedAt,
  //       password: user.password,
  //       isDeleted: user.isDeleted,
  //       plainPassword: user.plainPassword,

  //       // School information
  //       schoolId: user.schoolId || '',
  //       school: user.school?.name || '',
  //       currentSessionId: user.school?.currentSessionId || '',
  //       currentSession: user.school?.currentSession?.name || '',
  //       currentTermId: user.school?.currentTermId || '',
  //       currentTerm: user.school?.currentTerm?.name || '',

  //       // SubRole information
  //       subRoleId: user.subRoleId || '',
  //       subRole: user.subRole?.name || '',

  //       // Student-specific fields (if user is a student)
  //       isStudent: !!user.student,
  //       studentId: user.student?.id || '',
  //       studentRegNo: user.student?.studentRegNo || '',
  //       dateOfBirth: user.student?.dateOfBirth || null,
  //       admissionStatus: user.student?.admissionStatus || null,
  //       classId: user.student?.classId || '',
  //       class: user.student?.class?.name || '',
  //       classArmId: user.student?.classArmId || '',
  //       classArm: user.student?.classArm?.name || '',

  //       // Parent information for students
  //       parentId: user.student?.parentId || '',
  //         parent: {
  //         firstname: user.student?.parent?.user?.firstname || '',
  //         lastname: user.student?.parent?.user?.lastname || '',
  //         othername: user.student?.parent?.user?.othername || '',
  //         email: user.student?.parent?.user?.email || '',
  //         contact: user.student?.parent?.user?.phone || '',
  //         relationship: user.student?.parent?.relationship || '',
  //         occupation: user.student?.parent?.occupation || '',
  //         address: user.student?.parent?.address || ''

  //         },

  //       // Staff-specific fields (if user is staff)
  //       isStaff: !!user.staff,
  //       staffId: user.staff?.id || '',
  //       staffRegNo: user.staff?.staffRegNo || '',
  //       department: user.staff?.department || '',
  //       position: user.staff?.position || '',

  //       // Parent-specific fields (if user is a parent)
  //       isParent: !!user.parent,
  //       parentUserId: user.parent?.id || '',
  //       occupation: user.parent?.occupation || '',
  //       relationship: user.parent?.relationship || '',

  //       // Common fields
  //       createdAt: user.createdAt,
  //       updatedAt: user.updatedAt,
  //       rememberToken: user.rememberToken || '',
  //       avatar: typeof user.avatar === 'object' && user.avatar ? (user.avatar as any).imageUrl || '' : '',
  //       createdBy: user.createdBy || '',
  //       updatedBy: user.updatedBy || '',

  //     };

  //     return { ...flatUser, permissions };
  //   } catch (error) {
  //     throw new ForbiddenException('Failed to retrieve user');
  //   }
  // }

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
      staffRegNo?: string;
      department?: string;
      position?: string;
      studentRegNo?: string;
      classArmId?: string;
      parentId?: string;
      occupation?: string;
      relationship?: string;
      subRoleFlag?: 'student' | 'staff' | 'parent'; // Optional flag to determine subRole type
    },
    req,
  ): Promise<User> {
    const requester = req.user as AuthenticatedUser;
    console.log(data, requester, 'Creating user with data:');
    // Validate subRoleId for non-superAdmin users
    let subRole: SubRole | null = null;
    if (data.role !== 'superAdmin') {
      if (!requester.schoolId) {
        throw new ForbiddenException('schoolId is required for users');
      }
      if (!data.subRoleId && !data.subRoleFlag) {
        throw new ForbiddenException('subRoleId is required for users');
      }
      subRole = await this.prisma.subRole.findFirst({
        where: {
          OR: [
            { id: data.subRoleId },
            {
              name: data.subRoleFlag ? { equals: data.subRoleFlag } : undefined,
            },
          ],
        },
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
    const username = await generateUniqueUsername(data.firstname);

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
      school:
        requester && requester.schoolId
          ? { connect: { id: requester.schoolId } }
          : undefined,
      subRole: data.subRoleId ? { connect: { id: data.subRoleId } } : undefined,
      createdBy: requester && requester.id,
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
                staffRegNo: data.staffRegNo,
                department: data.department,
                position: data.position,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'student') {
            await tx.student.create({
              data: {
                user: { connect: { id: createdUser.id } },
                studentRegNo: data.studentRegNo,
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
            // create class assignment if classId is provided
            // if(data.classId) {
            //   await tx.studentClassAssignment.create({
            //     data: {
            //       // user: { connect: { id: createdUser.id } },
            //       studentId: createdUser.id,
            //       classArmId: data.classArmId,
            //       termId: null, // Assuming termId is not provided in this context
            //       sessionId,
            //       classId: data.classId,
            //       createdBy: requester.id,
            //     },
            //   });
            // }
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
                staffRegNo: data.staffRegNo,
                department: data.department,
                position: data.position,
                updatedBy: requester.id,
              },
              create: {
                // id: uuidv4(),
                userId: id,
                staffRegNo: data.staffRegNo,
                department: data.department,
                position: data.position,
                createdBy: requester.id,
              },
            });
          } else if (subRole.name.toLowerCase() === 'student') {
            await tx.student.upsert({
              where: { userId: id },
              update: {
                studentRegNo: data.studentRegNo,
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
                studentRegNo: data.studentRegNo,
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
        isDeleted: false,
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

      // 5. Add subRoleFlag filter with additional conditions
      if (subRoleFlag === 'student') {
        where.student = {
          isNot: null,
          is: {
            admissionStatus: AdmissionStatus.accepted, // Only show accepted students
          },
        };
      } else if (subRoleFlag === 'staff') {
        where.staff = { isNot: null };
      } else if (subRoleFlag === 'parent') {
        // Only show parents who have at least one accepted student
        where.parent = {
          isNot: null,
          is: {
            students: {
              some: {
                admissionStatus: AdmissionStatus.accepted,
              },
            },
          },
        };
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
            student: {
              include: {
                class: true,
                classArm: true,
                parent: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            staff: true,
            parent: true,
            subRole: true,
            school: {
              include: {
                currentSession: true,
                currentTerm: true,
              },
            },
          },
        }),
        this.prisma.user.count({ where }),
      ]);

      // Transform the nested data into a flat structure
      const flattenedUsers = users.map((user) => {
        const flatUser = {
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          othername: user.othername || '',
          email: user.email,
          phone: user.phone || '',
          gender: user.gender,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          religion: user.religion || '',
          nationality: user.nationality || '',
          stateOfOrigin: user.stateOfOrigin || '',
          lga: user.lga || '',
          emailVerifiedAt: user.emailVerifiedAt,
          password: user.password,
          isDeleted: user.isDeleted,
          plainPassword: user.plainPassword,

          // School information
          schoolId: user.schoolId || '',
          schoolName: user.school?.name || '',
          currentSessionId: user.school?.currentSessionId || '',
          currentSessionName: user.school?.currentSession?.name || '',
          currentTermId: user.school?.currentTermId || '',
          currentTermName: user.school?.currentTerm?.name || '',

          // SubRole information
          subRoleId: user.subRoleId || '',
          subRoleName: user.subRole?.name || '',

          // Student-specific fields (if user is a student)
          isStudent: !!user.student,
          studentId: user.student?.id || '',
          studentRegNo: user.student?.studentRegNo || '',
          dateOfBirth: user.student?.dateOfBirth || null,
          admissionStatus: user.student?.admissionStatus || null,
          classId: user.student?.classId || '',
          className: user.student?.class?.name || '',
          classArmId: user.student?.classArmId || '',
          classArmName: user.student?.classArm?.name || '',

          // Parent information for students
          parentId: user.student?.parentId || '',
          parentName: user.student?.parent
            ? `${user.student.parent.user?.firstname || ''} ${user.student.parent.user?.lastname || ''}`.trim()
            : '',

          // Staff-specific fields (if user is staff)
          isStaff: !!user.staff,
          staffId: user.staff?.id || '',
          staffRegNo: user.staff?.staffRegNo || '',
          department: user.staff?.department || '',
          position: user.staff?.position || '',

          // Parent-specific fields (if user is a parent)
          isParent: !!user.parent,
          parentUserId: user.parent?.id || '',
          occupation: user.parent?.occupation || '',
          relationship: user.parent?.relationship || '',

          // Common fields
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          rememberToken: user.rememberToken || '',
          avatar:
            typeof user.avatar === 'object' && user.avatar
              ? (user.avatar as any).imageUrl || ''
              : '',
          createdBy: user.createdBy || '',
          updatedBy: user.updatedBy || '',
        };

        return flatUser;
      });

      return {
        users: flattenedUsers,
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
