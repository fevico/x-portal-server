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
import { uploadToCloudinary } from '@/utils/cloudinary';

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
        school: { select: { id: true, name: true, slug: true } },
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
    console.log(user);
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

  async create(
    data: {
      firstname?: string;
      lastname?: string;
      othername?: string;
      email?: string;
      contact?: string;
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
      dateOfBirth?: Date | null;
      religion?: string | null;
      nationality?: string | null;
      stateOfOrigin?: string | null;
      lga?: string | null;
      subRoleFlag?: 'student' | 'staff' | 'parent'; // Optional flag to determine subRole type
    },
    req,
  ): Promise<User> {
    const requester = req.user as AuthenticatedUser;
    // console.log(data, requester, 'Creating user with data:');
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
      contact: data.contact,
      gender: data.gender,
      password: hashedPassword,
      plainPassword,
      role: data.role || 'admin',
      schoolSlug: requester.schoolSlug,
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
                // department: data.department,
                // position: data.position,
                // qualifications: data.qualifications,
                // createdByUser: { connect: { id: requester.id } },
              },
            });
          } else if (subRole.name.toLowerCase() === 'student') {
            await tx.student.create({
              data: {
                user: { connect: { id: createdUser.id } },
                studentRegNo: data.studentRegNo || null,
                dateOfBirth: data.dateOfBirth || null,
                class: data.classId
                  ? { connect: { id: data.classId } }
                  : undefined,
                classArm: data.classArmId
                  ? { connect: { id: data.classArmId } }
                  : undefined,
                admissionStatus: AdmissionStatus.accepted, // Default to accepted
                religion: data.religion || null,
                nationality: data.nationality || null,
                stateOfOrigin: data.stateOfOrigin || null,
                lga: data.lga || null,
                parent: data.parentId
                  ? { connect: { id: data.parentId } }
                  : undefined,
                // createdByUser: { connect: { id: requester.id } },
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
                // createdByUser: { connect: { id: requester.id } },
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
        if (error.meta?.target?.includes('contact')) {
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
      where: { id, isDeleted: false },
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
            contact: data.phone,
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
                qualifications: data.qualifications,
                // department: data.department,
                // position: data.position,
                updatedBy: requester.id,
              },
              create: {
                // id: uuidv4(),
                userId: id,
                staffRegNo: data.staffRegNo,
                qualifications: data.qualifications,
                // department: data.department,
                // position: data.position,
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
                // updatedByUser: { connect: { id: requester.id } },
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
                // createdByUser: { connect: { id: requester.id } },
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
        if (error.meta?.target?.includes('contact')) {
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
    users: any[];
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
          contact: user.contact || '',
          gender: user.gender,
          username: user.username,
          role: user.role,
          isActive: user.isActive,
          emailVerifiedAt: user.emailVerifiedAt,
          password: user.password,
          isDeleted: user.isDeleted,
          plainPassword: user.plainPassword,

          // School information
          schoolId: user.schoolId || '',
          schoolName: user.school?.name || '',
          schoolSlug: user.school?.slug || '',
          currentSessionId: user.school?.currentSessionId || '',
          currentSessionName: user.school?.currentSession?.name || '',
          currentTermId: user.school?.currentTermId || '',
          currentTermName: user.school?.currentTerm || '',

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
          // department: user.staff?.department || '',
          // position: user.staff?.position || '',

          // Parent-specific fields (if user is a parent)
          isParent: !!user.parent,
          parentUserId: user.parent?.id || '',
          occupation: user.parent?.occupation || '',
          relationship: user.parent?.relationship || '',

          // Common fields
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
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

  async getStudentById(studentId: string) {
    // Fetch student and all related fields
    const student = await this.prisma.student.findFirst({  
      where: {
        id: studentId,
      },
      include: {
        user: {
          select: {
            id: true,
            firstname: true,
            lastname: true,
            othername: true,
            email: true,
            username: true,
            gender: true,
            avatar: true,
            createdAt: true,
            updatedAt: true,
            isActive: true,
          },
        },
        parent: {
          include: {
            user: {
              select: {
                id: true,
                firstname: true,
                lastname: true,
                email: true,
                contact: true,
                address: true, // Assuming address is stored in user
                othername: true,
              },
            },
          },
        },
        class: { select: { id: true, name: true } }, // Current class
        classArm: { select: { id: true, name: true } }, // Current class arm
        admission: {
          include: {
            parent: { include: { user: true } },
            presentClass: { select: { id: true, name: true } },
            classToApply: { select: { id: true, name: true } },
            assignedClass: { select: { id: true, name: true } },
            assignedClassArm: { select: { id: true, name: true } },
            session: { select: { id: true, name: true } },
          },
        },
        classAssignments: {
          include: {
            class: { select: { id: true, name: true } },
            classArm: { select: { id: true, name: true } },
            session: { select: { id: true, name: true } },
            promotedFromAssignment: {
              include: {
                session: { select: { id: true, name: true } },
                class: { select: { id: true, name: true } },
                classArm: { select: { id: true, name: true } },
              },
            },
          },
        },
        subjects: {
          include: {
            subject: true,
            classArmSubjectAssignment: {
              include: {
                class: true,
                classArm: true,
                subject: true,
              },
            },
          },
        },
        invoiceAssignments: {
          include: {
            invoice: {
              include: {
                class: true,
                classArm: true,
                school: { select: { name: true } },
              },
            },
          },
        },
        attendanceRecords: {
          include: {
            class: true,
            classArm: true,
            session: true,
            term: {
              include: {
                termDefinition: true,
              },
            },
          },
        },
        studentResults: {
          include: {
            subject: true,
            grade: true,
            resultBatch: {
              include: {
                class: true,
                classArm: true,
                session: true,
                termDefinition: true,
              },
            },
          },
        },
        termRecords: {
          include: {
            class: true,
            classArm: true,
            session: true,
            termDefinition: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException('Student not found');
    }

    // Flatten all fields for easy consumption
    const parentUser = student.parent ? student.parent.user : null;

    const flat = {
      id: student.id,
      regNo: student.studentRegNo,
      firstname: student.user?.firstname,
      lastname: student.user?.lastname,
      othername: student.user?.othername,
      email: student.user?.email,
      username: student.user?.username,
      gender: student.user?.gender,
      avatar: (student.user?.avatar as any)?.imageUrl || null,
      createdDate: student.user?.createdAt?.toISOString() || '',
      updatedDate: student.user?.updatedAt?.toISOString() || '',
      isAlumni: student.isAlumni,
      religion: student.religion || '',
      nationality: student.nationality || '',
      stateOfOrigin: student.stateOfOrigin || '',
      lga: student.lga || '',
      dateOfBirth: student.dateOfBirth
        ? student.dateOfBirth.toISOString()
        : null,
      admissionStatus: student.admissionStatus || null,
      isActive: student.user?.isActive || false,

      parentData: {
        id: student.parent?.id || '',
        firstname: parentUser?.firstname || '',
        lastname: parentUser?.lastname || '',
        othername: parentUser?.othername || '',
        email: parentUser?.email || '',
        occupation: student.parent?.occupation || '',
        relationship: student.parent?.relationship || '',

        contact: student.parent?.user?.contact || '',
        address: student.parent?.user?.address || '', // Assuming address is stored in user
      },
      relationship: student.parent?.relationship || '',
      currentClass: student.class
        ? { id: student.class.id, name: student.class.name }
        : null,
      currentClassArm: student.classArm
        ? { id: student.classArm.id, name: student.classArm.name }
        : null,
      classAssignments:
        student.classAssignments?.map((ca) => ({
          session: ca.session?.name,
          class: ca.class?.name,
          classArm: ca.classArm?.name,
          isActive: ca.isActive,
          promotedFrom: ca.promotedFromAssignment
            ? {
                session: ca.promotedFromAssignment?.session?.name,
                class: ca.promotedFromAssignment?.class?.name,
                classArm: ca.promotedFromAssignment?.classArm?.name,
              }
            : null,
        })) || [],
      subjects:
        student.subjects?.map((subj) => ({
          subjectId: subj.subject.id,
          subjectName: subj.subject.name,
          subjectCode: subj.subject.code,
          classArmSubjectAssignment: subj.classArmSubjectAssignment
            ? {
                class: subj.classArmSubjectAssignment.class?.name,
                classArm: subj.classArmSubjectAssignment.classArm?.name,
              }
            : null,
        })) || [],
      invoices:
        student.invoiceAssignments?.map((assignment) => ({
          id: assignment.invoice.id,
          title: assignment.invoice.title,
          amount: assignment.invoice.amount,
          status: assignment.status,
          class: assignment.invoice.class?.name,
          classArm: assignment.invoice.classArm?.name,
          // dueDate: assignment.invoice.dueDate,
          paid: assignment.paid,
          outstanding: assignment.outstanding,
          school: assignment.invoice.school?.name,
        })) || [],
      attendance:
        student.attendanceRecords?.map((att) => ({
          date: att.date,
          status: att.status,
          class: att.class?.name,
          classArm: att.classArm?.name,
          session: att.session?.name,
          term: att.term?.termDefinition?.name,
        })) || [],
      results:
        student.studentResults?.map((res) => ({
          subject: res.subject?.name,
          score: res.totalScore,
          grade: res.grade?.name,
          batch: res.resultBatch?.title,
          class: res.resultBatch?.class?.name,
          classArm: res.resultBatch?.classArm?.name,
          session: res.resultBatch?.session?.name,
          term: res.resultBatch?.termDefinition?.name,
        })) || [],
      termRecords:
        student.termRecords?.map((tr) => ({
          session: tr.session?.name,
          term: tr.termDefinition?.name,
          class: tr.class?.name,
          classArm: tr.classArm?.name,
          punctuality: tr.punctuality,
          attentiveness: tr.attentiveness,
          leadershipSkills: tr.leadershipSkills,
          neatness: tr.neatness,
          attendanceTotal: tr.attendanceTotal,
          attendancePresent: tr.attendancePresent,
          attendanceAbsent: tr.attendanceAbsent,
          classTeacherComment: tr.classTeacherComment,
          principalComment: tr.principalComment,
        })) || [],
      admission: student.admission
        ? {
            session: student.admission.session?.name,
            parent: student.admission.parent?.user
              ? `${student.admission.parent.user.firstname} ${student.admission.parent.user.lastname}`
              : null,
            presentClass: student.admission.presentClass?.name,
            classToApply: student.admission.classToApply?.name,
            assignedClass: student.admission.assignedClass?.name,
            assignedClassArm: student.admission.assignedClassArm?.name,
            status: student.admission.admissionStatus,
            admissionDate: student.admission.admissionDate,
          }
        : null,
    };

    return flat;
  }
  /**
   * CRUD for Parents
   */
  async createParent(data: any, requester: User) {
    try {
      const subRole = await this.prisma.subRole.findFirst({
        where: { name: 'parent', isGlobal: true },
        select: { id: true },
      });
      if (!subRole) {
        throw new NotFoundException('Global subRole "parent" not found');
      }

      let schoolSlug: string | undefined = undefined;
      if (requester.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: requester.schoolId },
          select: { slug: true },
        });
        if (school) {
          schoolSlug = school.slug;
        }
      }

      let avatarObj: any = null;
      if (data.avatarFile) {
        const uploadResult = await uploadToCloudinary(data.avatarFile.buffer, {
          folder: 'parent',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      } else if (data.avatarBase64) {
        const uploadResult = await uploadToCloudinary(data.avatarBase64, {
          folder: 'parent',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      }

      return await this.prisma.$transaction(
        async (tx) => {
          const username = await generateUniqueUsername(data.firstname);
          const plainPassword = generateRandomPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          const user = await tx.user.create({
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              othername: data.othername,
              email: data.email,
              contact: data.contact,
              gender: data.gender,
              username,
              address: data.address,
              password: hashedPassword,
              plainPassword,
              role: 'admin',
              subRole: { connect: { id: subRole.id } },
              school: requester.schoolId
                ? { connect: { id: requester.schoolId } }
                : undefined,
              schoolSlug,
              avatar: avatarObj,
              createdBy: requester.id,
            },
          });

          const parent = await tx.parent.create({
            data: {
              userId: user.id,
              occupation: data.occupation,
              // relationship: data.relationship,
              createdBy: requester.id,
            },
          });

          return { user, parent };
        },
        {
          maxWait: 15000,
          timeout: 15000,
        },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('contact')) {
          throw new ForbiddenException('Phone number already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
      }
      throw new ForbiddenException('Failed to create parent');
    }
  }

  async updateParent(parentId: string, data: any, requester: User) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId, isDeleted: false },
      include: { user: true },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    await this.prisma.user.update({
      where: { id: parent.userId },
      data: {
        firstname: data.firstname,
        lastname: data.lastname,
        othername: data.othername,
        email: data.email,
        contact: data.contact,
        address: data.address,
        gender: data.gender,
        updatedBy: requester.id,
      },
    });
    return await this.prisma.parent.update({
      where: { id: parentId },
      data: {
        occupation: data.occupation,
        relationship: data.relationship,
        updatedBy: requester.id,
      },
    });
  }

  async deleteParent(parentId: string, requester: User) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: { user: true },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    await this.prisma.user.update({
      where: { id: parent.userId },
      data: { isDeleted: true, isActive: false, updatedBy: requester.id },
    });
    return await this.prisma.parent.update({
      where: { id: parentId },
      data: { isDeleted: true, updatedBy: requester.id },
    });
  }

  async getParentById(parentId: string) {
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId, isDeleted: false },
      include: {
        user: true,
        students: {
          include: {
            user: true,
            class: true,
            classArm: true,
          },
        },
      },
    });
    if (!parent) throw new NotFoundException('Parent not found');
    return parent;
  }

  async getAllParents(query: any, requester: User) {
    try {
      const { sessionId, classId, classArmId, q } = query;
      const { page, limit } = query;

      // Parse page and limit only if provided, otherwise undefined
      const pageInt = page !== undefined ? parseInt(page, 10) : undefined;
      const limitInt = limit !== undefined ? parseInt(limit, 10) : undefined;
      const skip =
        pageInt !== undefined && limitInt !== undefined
          ? (pageInt - 1) * limitInt
          : undefined;

      const where: any = {
        user: { schoolId: requester.schoolId, isDeleted: false },
        isDeleted: false,
      };
      if (q) {
        where.user.OR = [
          { firstname: { contains: q } },
          { lastname: { contains: q } },
        ];
      }
      // If session/class/classArm provided, filter parents with wards in those contexts
      if (sessionId || classId || classArmId) {
        where.students = {
          some: {
            ...(sessionId && { classAssignments: { some: { sessionId } } }),
            ...(classId && { classAssignments: { some: { classId } } }),
            ...(classArmId && { classAssignments: { some: { classArmId } } }),
          },
        };
      }
      const [parents, total] = await Promise.all([
        this.prisma.parent.findMany({
          where,
          include: {
            user: true,
            students: {
              include: {
                user: true,
                class: true,
                classArm: true,
              },
            },
          },
          ...(skip !== undefined ? { skip } : {}),
          ...(limitInt !== undefined ? { take: limitInt } : {}),
          orderBy: { createdAt: 'desc' },
        }),
        this.prisma.parent.count({ where }),
      ]);

      const totalParents = await this.prisma.parent.count({
        where: {
          user: { schoolId: requester.schoolId, isDeleted: false },
          isDeleted: false,
        },
      });

      // Flatten the parent and user data into a flat list
      const flatParents = parents.map((parent) => ({
        id: parent.id,
        firstname: parent.user?.firstname || '',
        lastname: parent.user?.lastname || '',
        othername: parent.user?.othername || '',
        email: parent.user?.email || '',
        contact: parent.user?.contact || '',
        gender: parent.user?.gender || '',
        username: parent.user?.username || '',
        address: parent.user?.address || '',
        avatar:
          typeof parent.user?.avatar === 'object' && parent.user?.avatar
            ? (parent.user.avatar as any).imageUrl || ''
            : '',
        isActive: parent.user?.isActive,
        isDeleted: parent.user?.isDeleted,
        occupation: parent.occupation || '',
        relationship: parent.relationship || '',
        createdAt: parent.user?.createdAt,
        updatedAt: parent.user?.updatedAt,
        students:
          parent.students?.map((student) => ({
            id: student.id,
            firstname: student.user?.firstname || '',
            lastname: student.user?.lastname || '',
            othername: student.user?.othername || '',
            classId: student.classId || '',
            className: student.class?.name || '',
            classArmId: student.classArmId || '',
            classArmName: student.classArm?.name || '',
          })) || [],
      }));

      return {
        parents: flatParents,
        total,
        totalParents,
        page: pageInt,
        limit: limitInt,
      };
    } catch (error: any) {
      console.error('Error in getAllParents:', error);
      throw new ForbiddenException(
        `Failed to fetch parents: ${error.message || error}`,
      );
    }
  }

  /**
   * CRUD for Staff/Teachers
   */
  async createStaff(data: any, requester: User) {
    try {
      // Validate subRole is staff
      const subRole = await this.prisma.subRole.findFirst({
        where: { name: 'staff', isGlobal: true },
        select: { id: true },
      });
      if (!subRole) {
        throw new NotFoundException('Global subRole "staff" not found');
      }

      let schoolSlug: string | undefined = undefined;
      if (requester.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: requester.schoolId },
          select: { slug: true },
        });
        if (school) {
          schoolSlug = school.slug;
        }
      }

      let avatarObj: any = null;
      if (data.avatarFile) {
        const uploadResult = await uploadToCloudinary(data.avatarFile.buffer, {
          folder: 'staff',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      } else if (data.avatarBase64) {
        const uploadResult = await uploadToCloudinary(data.avatarBase64, {
          folder: 'staff',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      }

      return await this.prisma.$transaction(
        async (tx) => {
          const username = await generateUniqueUsername(data.firstname);
          const plainPassword = generateRandomPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);

          const user = await tx.user.create({
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              othername: data.othername,
              email: data.email,
              contact: data.contact,
              gender: data.gender,
              username,
              password: hashedPassword,
              address: data.address,
              plainPassword,
              role: 'admin',
              subRole: { connect: { id: subRole.id } },
              school: requester.schoolId
                ? { connect: { id: requester.schoolId } }
                : undefined,
              schoolSlug,
              avatar: avatarObj,
              createdBy: requester.id,
            },
          });
          // Create Staff
          const staff = await tx.staff.create({
            data: {
              userId: user.id,
              staffRegNo: data.staffRegNo,
              qualifications: data.qualifications,
              createdBy: requester.id,
            },
          });
          return { user, staff };
        },
        {
          maxWait: 15000,
          timeout: 15000,
        },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('contact')) {
          throw new ForbiddenException('Phone number already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
      }
      throw new ForbiddenException('Failed to create staff');
    }
  }

  async updateStaff(staffId: string, data: any, requester: User) {
    try {
      // Validate staff exists
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId, isDeleted: false },
        include: { user: true },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      // Validate subRole is staff
      const subRole = await this.prisma.subRole.findFirst({
        where: { name: 'staff', isGlobal: true },
        select: { id: true },
      });
      if (!subRole) {
        throw new NotFoundException('Global subRole "staff" not found');
      }

      // Get schoolSlug if needed
      let schoolSlug: string | undefined = undefined;
      if (requester.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: requester.schoolId },
          select: { slug: true },
        });
        if (school) {
          schoolSlug = school.slug;
        }
      }

      // Handle avatar upload if provided
      let avatarObj: any = staff.user.avatar || null;
      if (data.avatarFile) {
        const uploadResult = await uploadToCloudinary(data.avatarFile.buffer, {
          folder: 'staff',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      } else if (data.avatarBase64) {
        const uploadResult = await uploadToCloudinary(data.avatarBase64, {
          folder: 'staff',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      }

      // Transactional update
      return await this.prisma.$transaction(
        async (tx) => {
          const user = await tx.user.update({
            where: { id: staff.userId },
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              othername: data.othername,
              email: data.email,
              contact: data.contact,
              address: data.address,
              gender: data.gender,
              schoolSlug,
              avatar: avatarObj,
              subRole: { connect: { id: subRole.id } },
              updatedBy: requester.id,
            },
          });
          const updatedStaff = await tx.staff.update({
            where: { id: staffId },
            data: {
              staffRegNo: data.staffRegNo,
              qualifications: data.qualifications,
              updatedBy: requester.id,
            },
          });
          return { user, staff: updatedStaff };
        },
        {
          maxWait: 15000,
          timeout: 15000,
        },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('contact')) {
          throw new ForbiddenException('Phone number already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
      }
      throw new ForbiddenException('Failed to update staff');
    }
  }

  async deleteStaff(staffId: string, requester: User) {
    const staff = await this.prisma.staff.findUnique({
      where: { id: staffId },
      include: { user: true },
    });
    if (!staff) throw new NotFoundException('Staff not found');
    await this.prisma.user.update({
      where: { id: staff.userId },
      data: { isDeleted: true, isActive: false, updatedBy: requester.id },
    });
    return await this.prisma.staff.update({
      where: { id: staffId },
      data: { isDeleted: true, updatedBy: requester.id },
    });
  }

  async getStaffById(staffId: string) {
    try {
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId },
        include: {
          user: true,
          classArmTeacherAssignments: {
            include: {
              class: true,
              classArm: true,
            },
          },
          teacherAssignments: {
            include: {
              subject: true,
              class: true,
              classArm: true,
            },
          },
        },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      // Flatten user fields safely
      const flatStaff = {
        id: staff.id,
        firstname: staff.user?.firstname || '',
        lastname: staff.user?.lastname || '',
        othername: staff.user?.othername || '',
        email: staff.user?.email || '',
        contact: staff.user?.contact || '',
        gender: staff.user?.gender || '',
        username: staff.user?.username || '',
        address: staff.user?.address || '',
        avatar:
          typeof staff.user?.avatar === 'object' && staff.user?.avatar
            ? (staff.user.avatar as any).imageUrl || ''
            : '',
        isActive: staff.user?.isActive,
        isDeleted: staff.user?.isDeleted,
        staffRegNo: staff.staffRegNo || '',
        qualifications: staff.qualifications || '',
        createdAt: staff.user?.createdAt,
        updatedAt: staff.user?.updatedAt,
        // Assigned classes (as classArmTeacherAssignments)
        assignedClasses:
          staff.classArmTeacherAssignments?.map((a) => ({
            classId: a.classId,
            className: a.class?.name || '',
            classArmId: a.classArmId,
            classArmName: a.classArm?.name || '',
          })) || [],
        // Assigned subjects (as teacherAssignments)
        assignedSubjects:
          staff.teacherAssignments?.map((t) => ({
            subjectId: t.subjectId,
            subjectName: t.subject?.name || '',
            classId: t.classId,
            className: t.class?.name || '',
            classArmId: t.classArmId,
            classArmName: t.classArm?.name || '',
          })) || [],
      };
      return flatStaff;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new NotFoundException('Failed to fetch staff');
    }
  }

  async getAllStaff(query: any, requester: User) {
    try {
      const { classId, classArmId, q, page = 1, limit = 20 } = query;
      const pageInt = parseInt(page, 10);
      const limitInt = parseInt(limit, 10);
      const skip = (pageInt - 1) * limitInt;
      const where: any = {
        user: { schoolId: requester.schoolId, isDeleted: false },
        isDeleted: false,
      };
      if (q) {
        where.user.OR = [
          { firstname: { contains: q } },
          { lastname: { contains: q } },
        ];
      }
      // If class/classArm provided, filter teachers assigned to those
      if (classId || classArmId) {
        where.classArmTeacherAssignments = {
          some: {
            ...(classId && { classId }),
            ...(classArmId && { classArmId }),
          },
        };
      }
      const [staff, total, totalStaff, totalMales, totalFemales] =
        await Promise.all([
          this.prisma.staff.findMany({
            where,
            include: {
              user: true,
              classArmTeacherAssignments: true,
              teacherAssignments: true,
            },
            skip,
            take: limitInt,
            orderBy: { createdAt: 'desc' },
          }),
          this.prisma.staff.count({ where }),
          this.prisma.staff.count({
            where: {
              user: { schoolId: requester.schoolId, isDeleted: false },
              isDeleted: false,
            },
          }),
          this.prisma.staff.count({
            where: {
              user: {
                schoolId: requester.schoolId,
                isDeleted: false,
                gender: 'male',
              },
              isDeleted: false,
            },
          }),
          this.prisma.staff.count({
            where: {
              user: {
                schoolId: requester.schoolId,
                isDeleted: false,
                gender: 'female',
              },
              isDeleted: false,
            },
          }),
        ]);
      // Flatten staff and user data
      const flatStaff = staff.map((s) => ({
        id: s.id,
        firstname: s.user?.firstname || '',
        lastname: s.user?.lastname || '',
        othername: s.user?.othername || '',
        email: s.user?.email || '',
        contact: s.user?.contact || '',
        gender: s.user?.gender || '',
        username: s.user?.username || '',
        address: s.user?.address || '',
        avatar:
          typeof s.user?.avatar === 'object' && s.user?.avatar
            ? (s.user.avatar as any).imageUrl || ''
            : '',
        isActive: s.user?.isActive,
        isDeleted: s.user?.isDeleted,
        staffRegNo: s.staffRegNo || '',
        qualifications: s.qualifications || '',
        createdAt: s.user?.createdAt,
        updatedAt: s.user?.updatedAt,
        assignedSubjects: s.teacherAssignments || [],
        assignedClass: s.classArmTeacherAssignments || [],
      }));

      return {
        staff: flatStaff,
        totalStaff,
        total,
        totalMales,
        totalFemales,
        page: pageInt,
        limit: limitInt,
      };
    } catch (error: any) {
      console.error('Error in getAllStaff:', error);
      throw new ForbiddenException(
        `Failed to fetch staff: ${error.message || error}`,
      );
    }
  }

  /**
   * Create a new student (creates User first, then Student, links them)
   * Used for direct student creation or on admission acceptance
   */
  async createStudent(
    data: {
      firstname: string;
      lastname: string;
      othername?: string;
      email: string;
      contact?: string;
      gender?: 'male' | 'female';
      password?: string;
      dateOfBirth?: Date | string;
      religion?: string;
      nationality?: string;
      stateOfOrigin?: string;
      lga?: string;
      parentId?: string;
      classId?: string;
      classArmId?: string;
      studentRegNo?: string;
      schoolId?: string;
      address?: string;
      avatarFile?: Express.Multer.File;
      avatarBase64?: string;
      sessionId?: string;
    },
    requester: User,
  ) {
    try {
      // Fetch school slug if schoolId is provided
      let schoolSlug: string | undefined = undefined;
      if (requester.schoolId) {
        const school = await this.prisma.school.findUnique({
          where: { id: requester.schoolId },
          select: { slug: true },
        });
        if (school) {
          schoolSlug = school.slug;
        }
      }

      const subRole = await this.prisma.subRole.findFirst({
        where: { name: 'student', isGlobal: true },
        select: { id: true },
      });
      if (!subRole) {
        throw new NotFoundException('Global subRole "student" not found');
      }

      // Handle avatar upload via Cloudinary
      let avatarObj: any = null;
      if (data.avatarFile) {
        const uploadResult = await uploadToCloudinary(data.avatarFile.buffer, {
          folder: 'students',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      } else if (data.avatarBase64) {
        const uploadResult = await uploadToCloudinary(data.avatarBase64, {
          folder: 'students',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      }

      // All DB operations in a transaction for atomicity
      return await this.prisma.$transaction(
        async (tx) => {
          // 1. Create User
          const username = await generateUniqueUsername(data.firstname);
          // const hashedPassword = data.password
          //   ? await bcrypt.hash(data.password, 10)
          //   : await bcrypt.hash(generateRandomPassword(), 10);
          const plainPassword = generateRandomPassword();
          const hashedPassword = await bcrypt.hash(plainPassword, 10);
          const user = await tx.user.create({
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              othername: data.othername,
              email: data.email,
              contact: data.contact,
              gender: data.gender,
              username,
              address: data.address,
              password: hashedPassword,
              plainPassword,
              role: 'admin',
              subRole: { connect: { id: subRole.id } },
              school: requester.schoolId
                ? { connect: { id: requester.schoolId } }
                : undefined,
              schoolSlug,
              avatar: avatarObj,
              createdBy: requester.id,
            },
          });

          // 2. Create Student and link to User
          const student = await tx.student.create({
            data: {
              user: { connect: { id: user.id } },
              studentRegNo: data.studentRegNo,
              dateOfBirth: data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : undefined,
              religion: data.religion,
              admissionStatus: AdmissionStatus.accepted,
              isAlumni: false,
              nationality: data.nationality,
              stateOfOrigin: data.stateOfOrigin,
              lga: data.lga,
              parent: data.parentId
                ? { connect: { id: data.parentId } }
                : undefined,
              class: data.classId
                ? { connect: { id: data.classId } }
                : undefined,
              classArm: data.classArmId
                ? { connect: { id: data.classArmId } }
                : undefined,
              createdByUser: { connect: { id: requester.id } },
            },
          });

          // 3. Create session-dependent records if sessionId, classId, classArmId provided
          if (data.sessionId && data.classId && data.classArmId) {
            // Deactivate any existing assignments for this student/session
            await tx.studentClassAssignment.updateMany({
              where: {
                studentId: student.id,
                sessionId: data.sessionId,
                isActive: true,
              },
              data: { isActive: false },
            });
            // Create new StudentClassAssignment
            await tx.studentClassAssignment.create({
              data: {
                studentId: student.id,
                sessionId: data.sessionId,
                classId: data.classId,
                classArmId: data.classArmId,
                schoolId: data.schoolId || requester.schoolId,
                isActive: true,
                createdBy: requester.id,
              },
            });
            // Assign subjects for class/arm/session
            const classArmSubjects =
              await tx.classArmSubjectAssignment.findMany({
                where: {
                  classId: data.classId,
                  classArmId: data.classArmId,
                  schoolId: data.schoolId || requester.schoolId,
                },
              });
            for (const cas of classArmSubjects) {
              await tx.studentSubjectAssignment.create({
                data: {
                  studentId: student.id,
                  subjectId: cas.subjectId,
                  schoolId: data.schoolId || requester.schoolId,
                  sessionId: data.sessionId,
                  classArmSubjectId: cas.id,
                  createdBy: requester.id,
                },
              });
            }
          }
          return { user, student };
        },
        {
          // Set a longer timeout for this transaction (e.g., 20 seconds)
          maxWait: 20000,
          timeout: 20000,
        },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('contact')) {
          throw new ForbiddenException('Phone number already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
        if (
          error.meta?.target?.includes('student_reg_no') ||
          error.meta?.target?.includes('students_student_reg_no_key')
        ) {
          throw new ForbiddenException(
            'Student registration number already exists',
          );
        }
      }
      console.log(error);
      throw new ForbiddenException('Failed to create student');
    }
  }

  async updateStudent(
    studentId: string,
    data: {
      firstname?: string;
      lastname?: string;
      othername?: string;
      email?: string;
      contact?: string;
      gender?: 'male' | 'female';
      dateOfBirth?: Date | string;
      religion?: string;
      nationality?: string;
      stateOfOrigin?: string;
      lga?: string;
      parentId?: string;
      classId?: string;
      classArmId?: string;
      studentRegNo?: string;
      schoolId?: string;
      avatarFile?: Express.Multer.File;
      avatarBase64?: string;
      sessionId?: string;
      address?: string;
    },
    requester: User,
  ) {
    try {
      // Find student and user
      const student = await this.prisma.student.findUnique({
        where: { id: studentId, isDeleted: false },
        include: { user: true },
      });
      if (!student) throw new NotFoundException('Student not found');

      // Handle avatar upload via Cloudinary
      let avatarObj: any = undefined;
      if (data.avatarFile) {
        const uploadResult = await uploadToCloudinary(data.avatarFile.buffer, {
          folder: 'students',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      } else if (data.avatarBase64) {
        const uploadResult = await uploadToCloudinary(data.avatarBase64, {
          folder: 'students',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        avatarObj = {
          imageUrl: uploadResult.imageUrl,
          pubId: uploadResult.pubId,
        };
      }

      return await this.prisma.$transaction(
        async (tx) => {
          // Update User
          await tx.user.update({
            where: { id: student.userId, isDeleted: false },
            data: {
              firstname: data.firstname,
              lastname: data.lastname,
              othername: data.othername,
              email: data.email,
              contact: data.contact,
              gender: data.gender,
              address: data.address,
              avatar: avatarObj !== undefined ? avatarObj : undefined,
              updatedBy: requester.id,
            },
          });

          // Update Student
          const updatedStudent = await tx.student.update({
            where: { id: studentId, isDeleted: false },
            data: {
              studentRegNo: data.studentRegNo,
              dateOfBirth: data.dateOfBirth
                ? new Date(data.dateOfBirth)
                : undefined,
              religion: data.religion,
              nationality: data.nationality,
              stateOfOrigin: data.stateOfOrigin,
              lga: data.lga,
              parent: data.parentId
                ? { connect: { id: data.parentId } }
                : undefined,
              class: data.classId
                ? { connect: { id: data.classId } }
                : undefined,
              classArm: data.classArmId
                ? { connect: { id: data.classArmId } }
                : undefined,
              updatedByUser: { connect: { id: requester.id } },
            },
          });

          // Update session-dependent records if sessionId, classId, classArmId provided
          // if (data.sessionId && data.classId && data.classArmId) {
          //   // Deactivate old assignments for this student/session
          //   await tx.studentClassAssignment.updateMany({
          //     where: {
          //       studentId: studentId,
          //       sessionId: data.sessionId,
          //       isActive: true,
          //     },
          //     data: { isActive: false },
          //   });
          //   // Create new StudentClassAssignment
          //   await tx.studentClassAssignment.create({
          //     data: {
          //       studentId: studentId,
          //       sessionId: data.sessionId,
          //       classId: data.classId,
          //       classArmId: data.classArmId,
          //       schoolId: data.schoolId || requester.schoolId,
          //       isActive: true,
          //       createdBy: requester.id,
          //     },
          //   });
          //   // Remove old subject assignments for this session
          //   await tx.studentSubjectAssignment.deleteMany({
          //     where: {
          //       studentId: studentId,
          //       sessionId: data.sessionId,
          //     },
          //   });
          //   // Assign subjects for class/arm/session
          //   const classArmSubjects =
          //     await tx.classArmSubjectAssignment.findMany({
          //       where: {
          //         classId: data.classId,
          //         classArmId: data.classArmId,
          //         schoolId: data.schoolId || requester.schoolId,
          //       },
          //     });
          //   for (const cas of classArmSubjects) {
          //     await tx.studentSubjectAssignment.create({
          //       data: {
          //         studentId: studentId,
          //         subjectId: cas.subjectId,
          //         schoolId: data.schoolId || requester.schoolId,
          //         sessionId: data.sessionId,
          //         classArmSubjectId: cas.id,
          //         createdBy: requester.id,
          //       },
          //     });
          //   }
          // }
          return updatedStudent;
        },
        {
          maxWait: 20000,
          timeout: 20000,
        },
      );
    } catch (error: any) {
      if (error.code === 'P2002') {
        if (error.meta?.target?.includes('email')) {
          throw new ForbiddenException('Email already exists');
        }
        if (error.meta?.target?.includes('contact')) {
          throw new ForbiddenException('Phone number already exists');
        }
        if (error.meta?.target?.includes('username')) {
          throw new ForbiddenException('Generated username already exists');
        }
        if (
          error.meta?.target?.includes('student_reg_no') ||
          error.meta?.target?.includes('students_student_reg_no_key')
        ) {
          throw new ForbiddenException(
            'Student registration number already exists',
          );
        }
      }
      console.error(error);
      throw new ForbiddenException('Failed to update student');
    }
  }

  /**
   * Soft delete student and linked user
   */
  async deleteStudent(studentId: string, requester: User) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: { user: true },
    });
    if (!student) throw new NotFoundException('Student not found');
    // Soft delete User
    await this.prisma.user.update({
      where: { id: student.userId },
      data: { isDeleted: true, isActive: false, updatedBy: requester.id },
    });
    // Soft delete Student
    return this.prisma.student.update({
      where: { id: studentId },
      data: { isDeleted: true, updatedBy: requester.id },
    });
  }

  /**
   * Link a parent to a student (and vice versa)
   */
  async linkParentToStudent(
    data: {
      studentId: string;
      parentId: string;
      relationship?: string;
      unlink?: boolean;
    },
    requester: User,
  ) {
    const { studentId, parentId, relationship, unlink } = data;
    try {
      return await this.prisma.$transaction(async (tx) => {
        // Validate student
        const student = await tx.student.findUnique({
          where: { id: studentId, isDeleted: false },
        });
        if (!student) throw new NotFoundException('Student not found');

        // Validate parent
        const parent = await tx.parent.findUnique({
          where: { id: parentId, isDeleted: false },
        });
        if (!parent) throw new NotFoundException('Parent not found');

        if (unlink) {
          // Unlink logic: check if student is linked to parent
          if (student.parentId !== parentId) {
            throw new NotFoundException('Student is not linked to this parent');
          }
          // Unlink by setting parentId and relationship to null
          await tx.student.update({
            where: { id: studentId },
            data: {
              parentId: null,
              updatedBy: requester.id,
            },
          });
          await tx.parent.update({
            where: { id: parentId },
            data: {
              relationship: null,
              updatedBy: requester.id,
            },
          });
          return { message: 'Parent unlinked from student successfully' };
        } else {
          // Link logic
          await tx.student.update({
            where: { id: studentId },
            data: {
              parentId: parentId,
              updatedBy: requester.id,
            },
          });
          await tx.parent.update({
            where: { id: parentId },
            data: {
              relationship: relationship ?? parent.relationship,
              updatedBy: requester.id,
            },
          });
          return { message: 'Parent linked to student successfully' };
        }
      });
    } catch (error: any) {
      if (error instanceof NotFoundException) throw error;
      console.error('Error linking/unlinking parent to student:', error);
      throw new ForbiddenException('Failed to link/unlink parent to student');
    }
  }
}
