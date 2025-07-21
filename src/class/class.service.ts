import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuthenticatedUser } from '@/types/express';
import { LoggingService } from '@/log/logging.service';
import { GetClassArmTeacherDto } from './dto/class-arm-teacher.dto';
import { AdmissionStatus } from '@prisma/client';

@Injectable()
export class ClassesService {
  constructor(
    private prisma: PrismaService,
    private loggingService: LoggingService,
  ) {}

  async create(createClassDto: { name: string; category: string }, req) {
    const user = req.user as AuthenticatedUser;
    if (!createClassDto.name) {
      throw new HttpException('Class name is required', HttpStatus.BAD_REQUEST);
    }

    if (!createClassDto.category) {
      throw new HttpException(
        'Class category is required',
        HttpStatus.BAD_REQUEST,
      );
    }

    // Check for existing class
    const existing = await this.prisma.class.findFirst({
      where: {
        name: createClassDto.name,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (existing) {
      throw new HttpException(
        'Class name already exists in this school',
        HttpStatus.CONFLICT,
      );
    }

    // Check if the category exists
    const categoryExists = await this.prisma.classCategory.findFirst({
      where: {
        id: createClassDto.category,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });
    if (!categoryExists) {
      throw new HttpException(
        'Class category does not exist in this school',
        HttpStatus.NOT_FOUND,
      );
    }

    const classRecord = await this.prisma.class.create({
      data: {
        name: createClassDto.name.toLowerCase(),
        schoolId: user.schoolId,
        classCategoryId: createClassDto.category,
        createdBy: user.id,
      },
    });

    await this.loggingService.logAction(
      'create_class',
      'Class',
      classRecord.id,
      user.id,
      user.schoolId,
      { name: classRecord.name },
      req,
    );

    return classRecord;
  }

  // class: { select: { id: true, name: true, category: true } },
  // +              class: {
  // +                select: {
  // +                  id: true,
  // +                  name: true,
  // +                },
  // +                include: {
  // +                  classCategory: { select: { name: true } },
  // +                },
  // +              },

  async findAll(req) {
    try {
      return await this.prisma.class.findMany({
        where: {
          schoolId: req.user.schoolId,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          classCategory: {
            select: {
              id: true,
              name: true,
            },
          },
          isActive: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to fetch classes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAllPublic(schoolId: string) {
    try {
      return await this.prisma.class.findMany({
        where: {
          schoolId,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      });
    } catch (error) {
      throw new HttpException(
        'Failed to fetch classes',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findOne(id: string, schoolId: string) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    return classRecord;
  }

  async update(
    id: string,
    updateClassDto: { name?: string; category?: string; isActive?: boolean },
    user: AuthenticatedUser,
  ) {
    console.log('Update Class DTO:', updateClassDto, id);
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    if (updateClassDto.name) {
      // Check for name conflict
      const existing = await this.prisma.class.findFirst({
        where: {
          name: updateClassDto.name.toLowerCase(),
          schoolId: user.schoolId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existing) {
        throw new HttpException(
          'Class name already exists in this school',
          HttpStatus.CONFLICT,
        );
      }
    }

    const updatedClass = await this.prisma.class.update({
      where: { id },
      data: {
        name: updateClassDto.name ?? classRecord.name,
        classCategoryId: updateClassDto.category ?? classRecord.classCategoryId,
        updatedBy: user.id,
        isActive: updateClassDto.isActive,
        updatedAt: new Date(),
      },
    });

    return updatedClass;
  }

  async delete(id: string, user: { id: string; schoolId: string }) {
    const classRecord = await this.prisma.class.findFirst({
      where: {
        id,
        schoolId: user.schoolId,
        isDeleted: false,
      },
    });

    if (!classRecord) {
      throw new HttpException('Class not found', HttpStatus.NOT_FOUND);
    }

    await this.prisma.class.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: user.id,
        updatedAt: new Date(),
      },
    });

    return { message: 'Class deleted successfully' };
  }

  async assignArms(
    payload: {
      classId: string;
      sessionId: string;
      arms: string[];
    }[],
    req: any,
  ) {
    const requester = req.user;
    const schoolId = requester.schoolId;

    console.log('Payload:', payload);
    console.log('Requester:', requester);

    // Validate session and school
    const session = await this.prisma.session.findFirst({
      where: {
        id: payload[0]?.sessionId,
        schoolId,
        isDeleted: false,
      },
    });
    if (!session) {
      throw new NotFoundException('Session not found for this school');
    }

    // Pre-fetch all ClassArms to avoid repeated findFirst calls
    const allClassArms = await this.prisma.classArm.findMany({
      where: {
        schoolId,
        isDeleted: false,
      },
      select: {
        id: true,
        name: true,
      },
    });

    return this.prisma.$transaction(
      async (tx) => {
        try {
          for (const item of payload) {
            // Validate class exists
            const classExists = await tx.class.findFirst({
              where: { id: item.classId, schoolId, isDeleted: false },
            });
            if (!classExists) {
              throw new NotFoundException(
                `Class with ID ${item.classId} not found`,
              );
            }

            // Delete existing assignments for this class and session
            await tx.sessionClassAssignment.deleteMany({
              where: {
                sessionId: item.sessionId,
                classId: item.classId,
                schoolId,
              },
            });

            // Map arm names to ClassArm IDs using pre-fetched data
            const armData = item.arms.map((armName) => {
              const classArm = allClassArms.find((ca) => ca.name === armName);
              if (!classArm) {
                throw new NotFoundException(
                  `ClassArm with name ${armName} not found`,
                );
              }
              return {
                sessionId: item.sessionId,
                classId: item.classId,
                classArmId: classArm.id,
                schoolId,
                // createdAt: new Date(), // Current date: 04:03 AM WAT, May 24, 2025
                // updatedAt: new Date(),
                createdBy: requester.id,
                updatedBy: requester.id,
              };
            });

            // Create new assignments (skip if arms is empty)
            if (armData.length > 0) {
              await tx.sessionClassAssignment.createMany({
                data: armData,
              });
            }

            // Log the action
            await this.loggingService.logAction(
              'assign_arms',
              'SessionClassClassArm',
              item.classId,
              requester.id,
              requester.schoolId,
              {
                sessionId: item.sessionId,
                classId: item.classId,
                arms: item.arms,
              },
              req,
            );
          }

          return { message: 'Arms assigned successfully' };
        } catch (error) {
          console.error('Error assigning arms:', error);
          throw new BadRequestException(
            `Failed to assign arms: ${error.message || 'Unknown error'}`,
          );
        }
      },
      {
        timeout: 10000, // Increase timeout to 10 seconds
      },
    );
  }

  // async findAllClassArm(user: { schoolId: string }, classId?: string) {
  //   return this.prisma.classClassArm.findMany({
  //     where: {
  //       schoolId: user.schoolId,
  //       isDeleted: false,
  //       ...(classId && { classId }),
  //     },
  //     include: {
  //       class: { select: { name: true } },
  //       classArm: { select: { name: true } },
  //     },
  //   });
  // }

  async createClassCategory(body: any, user: AuthenticatedUser) {
    const { name } = body;
    const schoolId = user.schoolId;

    try {
      const existingCategory = await this.prisma.classCategory.findFirst({
        where: {
          name,
          isDeleted: false,
          schoolId, // Ensure the category is unique per school
        },
        include: { classes: true },
      });

      if (existingCategory) {
        throw new BadRequestException('Class category already exists');
      }

      const classCategory = await this.prisma.classCategory.create({
        data: {
          name: body.name,
          createdBy: user.id,
          school: { connect: { id: schoolId } },
        },
      });

      return classCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to create class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getAllClassCategories(user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const classCategories = await this.prisma.classCategory.findMany({
        where: {
          schoolId,
          isDeleted: false,
        },
        orderBy: { name: 'asc' },
        include: { classes: true },
      });
      // console.log('Class Categories:', classCategories);
      return {
        classCategories,
        message: 'Class categories fetched successfully',
      };
    } catch (error) {
      throw new HttpException(
        'Failed to fetch class categories',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClassCategoryById(id: string, user: AuthenticatedUser) {
    console.log(user);
    try {
      const classCategory = await this.prisma.classCategory.findUnique({
        where: { id },
        include: { classes: true },
      });

      if (!classCategory) {
        throw new NotFoundException('Class category not found');
      }

      return classCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to fetch class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateClassCategory(id: string, body: any, user: AuthenticatedUser) {
    const { name } = body;
    const schoolId = user.schoolId;
    try {
      const schoolCategory = await this.prisma.classCategory.findFirst({
        where: {
          id,
          schoolId,
          isDeleted: false,
        },
      });
      if (!schoolCategory) {
        throw new NotFoundException(
          `Class category not found for this school ${id}`,
        );
      }

      const updatedCategory = await this.prisma.classCategory.update({
        where: { id },
        data: {
          name,
          updatedBy: user.id,
        },
      });
      return updatedCategory;
    } catch (error) {
      throw new HttpException(
        'Failed to update class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async deleteClassCategory(id: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    try {
      const classCategory = await this.prisma.classCategory.findFirst({
        where: {
          id,
          schoolId,
          isDeleted: false,
        },
      });

      if (!classCategory) {
        throw new NotFoundException('Class category not found');
      }

      await this.prisma.classCategory.update({
        where: { id },
        data: {
          isDeleted: true,
          updatedBy: user.id,
        },
      });

      return { message: 'Class category deleted successfully' };
    } catch (error) {
      throw new HttpException(
        'Failed to delete class category',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async getClassesBySession(sessionId: string, user: AuthenticatedUser) {
    try {
      // Validate session exists and belongs to the school
      const session = await this.prisma.session.findFirst({
        where: {
          id: sessionId,
          schoolId: user.schoolId,
          isDeleted: false,
        },
        select: { id: true, name: true },
      });

      if (!session) {
        throw new NotFoundException('Session not found for this school');
      }

      // Get all class assignments for the session
      const classAssignments =
        await this.prisma.sessionClassAssignment.findMany({
          where: {
            sessionId,
            schoolId: user.schoolId,
            isDeleted: false,
          },
          include: {
            class: {
              select: {
                id: true,
                name: true,
                classCategory: {
                  select: { id: true, name: true },
                },
              },
            },
            classArm: {
              select: { id: true, name: true },
            },
          },
          orderBy: [{ class: { name: 'asc' } }, { classArm: { name: 'asc' } }],
        });

      // Group class arms by class
      const classesMap = new Map();

      classAssignments.forEach((assignment) => {
        const classId = assignment.class.id;

        if (!classesMap.has(classId)) {
          classesMap.set(classId, {
            id: assignment.class.id,
            name: assignment.class.name,
            category: assignment.class.classCategory,
            classArms: [],
          });
        }

        classesMap.get(classId).classArms.push({
          id: assignment.classArm.id,
          name: assignment.classArm.name,
        });
      });

      // Convert map to array and sort
      const classes = Array.from(classesMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
      );

      return {
        statusCode: 200,
        message: 'Classes and arms retrieved successfully',
        data: {
          session: {
            id: session.id,
            name: session.name,
          },
          classes,
          totalClasses: classes.length,
          totalAssignments: classAssignments.length,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      console.error('Error fetching classes by session:', error);
      throw new HttpException(
        'Failed to fetch classes and arms',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
  async getStudentClassAssignment(user: AuthenticatedUser, query: any) {
    try {
      const {
        classId,
        classArmId,
        sessionId,
        q,
        page = 1,
        limit = 20,
        gender = false,
        alumni = false,
      } = query;
      const schoolId = user.schoolId;
      // Validation logic
      if (classArmId && !classId) {
        throw new HttpException(
          'classId is required when classArmId is provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (classId && !sessionId) {
        throw new HttpException(
          'sessionId is required when classId is provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      if (classArmId && !sessionId) {
        throw new HttpException(
          'sessionId is required when classArmId is provided',
          HttpStatus.BAD_REQUEST,
        );
      }
      // Pagination
      const pageInt = parseInt(page, 10) || 1;
      const limitInt = parseInt(limit, 10) || 20;
      const skip = (pageInt - 1) * limitInt;
      let students = [];
      let total = 0;
      let sessionObj = null;
      let classObj = null;
      let classArmObj = null;
      let totalMales = 0;
      let totalFemales = 0;
      const includeGenderStats = gender === true || gender === 'true';
      const alumniBool = alumni === true || alumni === 'true';

      if (!sessionId) {
        // Fetch from student model to avoid duplicates
        const where: any = {
          isAlumni: alumniBool,
          admissionStatus: AdmissionStatus.accepted,
          isDeleted: false,
          user: {
            schoolId,
          },
        };
        if (q) {
          where.user.OR = [
            { firstname: { contains: q } },
            { lastname: { contains: q } },
          ];
        }
        // Query students
        const [studentRecords, count] = await Promise.all([
          this.prisma.student.findMany({
            where,
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
                  contact: true,
                  address: true,
                },
              },
              parent: {
                include: {
                  user: {
                    select: {
                      id: true,
                      firstname: true,
                      lastname: true,
                    },
                  },
                },
              },
              class: {
                select: {
                  id: true,
                  name: true,
                },
              },
              classArm: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
            orderBy: {
              user: {
                lastname: 'asc',
              },
            },
            skip,
            take: limitInt,
          }),
          this.prisma.student.count({
            where,
          }),
        ]);
        students = studentRecords.map((student) => {
          const parent = student.parent?.user;
          return {
            id: student.id,
            studentRegNo: student.studentRegNo,
            fullName:
              `${student.user.lastname || ''} ${student.user.firstname || ''} ${student.user.othername || ''}`.trim(),
            firstname: student.user.firstname,
            lastname: student.user.lastname,
            othername: student.user.othername,
            email: student.user.email,
            username: student.user.username,
            gender: student.user.gender,
            avatar: (student.user.avatar as any)?.imageUrl || null,
            parentGuardian: parent
              ? `${parent.firstname} ${parent.lastname}`
              : 'Not specified',
            contact: student.user.contact || 'Not specified',
            address: student.user.address || 'Not specified',
            parentId: student.parent?.id || null,
            dateOfBirth: student.dateOfBirth || 'Not specified',
            religion: student.religion || 'Not specified',
            stateOfOrigin: student.stateOfOrigin || 'Not specified',
            nationality: student.nationality || 'Not specified',
            relationship: student.parent?.relationship || 'Not specified',
            createdDate: student.user.createdAt?.toISOString() || '',
            classId: student.classId || null,
            classArmId: student.classArmId || null,
            className: student.class?.name || 'Not assigned',
            classArmName: student.classArm?.name || 'Not assigned',
            lga: student.lga || 'Not specified',
          };
        });
        total = count;

        if (includeGenderStats) {
          // Count gender from all students matching the filter (not just paginated)
          const [maleCount, femaleCount] = await Promise.all([
            this.prisma.student.count({
              where: {
                ...where,
                user: {
                  ...where.user,
                  gender: 'male',
                },
              },
            }),
            this.prisma.student.count({
              where: {
                ...where,
                user: {
                  ...where.user,
                  gender: 'female',
                },
              },
            }),
          ]);
          totalMales = maleCount;
          totalFemales = femaleCount;
        }
      } else {
        // Use studentClassAssignment for session-based queries
        const alumniBool = alumni === true || alumni === 'true';
        const where: any = {
          schoolId,
          isActive: true,
          student: {
            isAlumni: alumniBool,
            admissionStatus: AdmissionStatus.accepted,
            isDeleted: false,
            user: {},
          },
        };
        if (sessionId) {
          where.sessionId = sessionId;
        }
        if (classId) {
          where.classId = classId;
        }
        if (classArmId) {
          where.classArmId = classArmId;
        }
        if (q) {
          where.student.user.OR = [
            { firstname: { contains: q } },
            { lastname: { contains: q } },
          ];
        }
        const [studentClassAssignments, count] = await Promise.all([
          this.prisma.studentClassAssignment.findMany({
            where,
            include: {
              class: {
                select: {
                  id: true,
                  name: true,
                  classCategory: {
                    select: { id: true, name: true },
                  },
                },
              },
              classArm: {
                select: { id: true, name: true },
              },
              session: {
                select: { id: true, name: true },
              },
              student: {
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
                      contact: true,
                      address: true,
                    },
                  },
                  parent: {
                    include: {
                      user: {
                        select: {
                          id: true,
                          firstname: true,
                          lastname: true,
                        },
                      },
                    },
                  },
                  class: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  classArm: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              student: {
                user: {
                  lastname: 'asc',
                },
              },
            },
            skip,
            take: limitInt,
          }),
          this.prisma.studentClassAssignment.count({ where }),
        ]);
        students = studentClassAssignments.map((assignment) => {
          const parent = assignment.student.parent?.user;
          return {
            id: assignment.student.id,
            studentRegNo: assignment.student.studentRegNo,
            fullName:
              `${assignment.student.user.lastname || ''} ${assignment.student.user.firstname || ''} ${assignment.student.user.othername || ''}`.trim(),
            firstname: assignment.student.user.firstname,
            lastname: assignment.student.user.lastname,
            othername: assignment.student.user.othername,
            email: assignment.student.user.email,
            username: assignment.student.user.username,
            gender: assignment.student.user.gender,
            avatar: (assignment.student.user.avatar as any)?.imageUrl || null,
            parentGuardian: parent
              ? `${parent.firstname} ${parent.lastname}`
              : 'Not specified',
            relationship:
              assignment.student.parent?.relationship || 'Not specified',
            createdDate: assignment.student.user.createdAt?.toISOString() || '',
            status: assignment.isActive ? 'Active' : 'Inactive',
            contact: assignment.student.user.contact || 'Not specified',
            address: assignment.student.user.address || 'Not specified',
            parentId: assignment.student.parent?.id || null,
            dateOfBirth: assignment.student.dateOfBirth || 'Not specified',
            religion: assignment.student.religion || 'Not specified',
            stateOfOrigin: assignment.student.stateOfOrigin || 'Not specified',
            nationality: assignment.student.nationality || 'Not specified',
            classId: assignment.student.classId || null,
            classArmId: assignment.student.classArmId || null,
            className: assignment.student.class?.name || 'Not assigned',
            classArmName: assignment.student.classArm?.name || 'Not assigned',
            lga: assignment.student.lga || 'Not specified',
          };
        });
        total = count;
        sessionObj = sessionId
          ? {
              id: sessionId,
              name: studentClassAssignments[0]?.session?.name || '',
            }
          : null;
        classObj = classId
          ? {
              id: classId,
              name: studentClassAssignments[0]?.class?.name || '',
            }
          : null;
        classArmObj = classArmId
          ? {
              id: classArmId,
              name: studentClassAssignments[0]?.classArm?.name || '',
            }
          : null;

        if (includeGenderStats) {
          // Count gender from all assignments matching the filter (not just paginated)
          const [maleCount, femaleCount] = await Promise.all([
            this.prisma.studentClassAssignment.count({
              where: {
                ...where,
                student: {
                  ...where.student,
                  user: {
                    ...where.student.user,
                    gender: 'male',
                  },
                },
              },
            }),
            this.prisma.studentClassAssignment.count({
              where: {
                ...where,
                student: {
                  ...where.student,
                  user: {
                    ...where.student.user,
                    gender: 'female',
                  },
                },
              },
            }),
          ]);
          totalMales = maleCount;
          totalFemales = femaleCount;
        }
      }
      // Preserve original response structure, add pagination
      const response: any = {
        statusCode: 200,
        message: 'Students in class arm retrieved successfully',
        data: {
          session: sessionObj,
          class: classObj,
          classArm: classArmObj,
          totalStudents: total,
          students,
          pagination: {
            page: pageInt,
            limit: limitInt,
            total,
            totalPages: Math.ceil(total / limitInt),
          },
        },
      };
      if (includeGenderStats) {
        response.data.totalMales = totalMales;
        response.data.totalFemales = totalFemales;
      }
      return response;
    } catch (error) {
      // Handle known HTTP exceptions
      if (error instanceof HttpException) {
        throw error;
      }
      // Fallback for unexpected errors
      throw new HttpException(
        'Failed to fetch student class assignments',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Assign or remove a staff to/from multiple class arms in multiple classes.
   * dto: { staffId: string, assignments: Array<{ classId: string, classArmIds: string[] }> }
   * query: { remove?: boolean }
   */
  async assignClassArmTeacher(
    dto: {
      staffId: string;
      assignments: Array<{ classId: string; classArmIds: string[] }>;
    },
    query,
    user,
  ) {
    try {
      const { staffId, assignments } = dto;
      if (!staffId || !Array.isArray(assignments) || assignments.length === 0) {
        throw new BadRequestException('staffId and assignments are required');
      }

      // Validate staff exists
      const staff = await this.prisma.staff.findUnique({
        where: { id: staffId },
      });
      if (!staff) throw new NotFoundException('Staff not found');

      // Validate all classes and classArms exist
      for (const assign of assignments) {
        const classObj = await this.prisma.class.findUnique({
          where: { id: assign.classId },
        });
        if (!classObj)
          throw new NotFoundException(`Class not found: ${assign.classId}`);
        for (const classArmId of assign.classArmIds) {
          const classArm = await this.prisma.classArm.findUnique({
            where: { id: classArmId },
          });
          if (!classArm)
            throw new NotFoundException(`Class arm not found: ${classArmId}`);
        }
      }

      // If remove flag is set, just remove the specified assignments for this staff
      if (query?.remove) {
        let removed = 0;
        for (const assign of assignments) {
          for (const classArmId of assign.classArmIds) {
            const assignment =
              await this.prisma.classArmTeacherAssignment.findFirst({
                where: {
                  classId: assign.classId,
                  classArmId: classArmId,
                  schoolId: user.schoolId,
                  isDeleted: false,
                  staffId: staffId,
                },
              });
            if (assignment) {
              await this.prisma.classArmTeacherAssignment.delete({
                where: { id: assignment.id },
              });
              removed++;
            }
          }
        }
        return { message: `Removed ${removed} assignment(s) for staff` };
      }

      // For normal requests: clear all current assignments for this staff, then create new ones from the payload
      // Remove all assignments for this staff in this school
      const deleted = await this.prisma.classArmTeacherAssignment.deleteMany({
        where: {
          staffId: staffId,
          schoolId: user.schoolId,
          isDeleted: false,
        },
      });
      let created = 0;
      const errors: string[] = [];
      for (const assign of assignments) {
        for (const classArmId of assign.classArmIds) {
          // Check if any assignment exists for this class/classArm/school (regardless of staff)
          const existing =
            await this.prisma.classArmTeacherAssignment.findFirst({
              where: {
                classId: assign.classId,
                classArmId: classArmId,
                schoolId: user.schoolId,
                isDeleted: false,
              },
            });
          if (existing) {
            errors.push(
              `Class ${assign.classId} arm ${classArmId} already has a teacher assigned.`,
            );
            continue;
          }
          await this.prisma.classArmTeacherAssignment.create({
            data: {
              staffId: staffId,
              classId: assign.classId,
              classArmId: classArmId,
              schoolId: user.schoolId,
              createdBy: user.createdBy,
            },
          });
          created++;
        }
      }
      if (errors.length > 0) {
        if (created === 0) {
          // All failed, throw error
          throw new BadRequestException({
            message:
              'No assignments created. All assignments failed because class/classArm already has a teacher assigned.',
            errors,
          });
        } else {
          // Partial success
          return {
            message: `Replaced assignments: ${deleted.count} removed, ${created} created. Some assignments failed:`,
            errors,
          };
        }
      }
      // All succeeded
      return {
        message: `Replaced assignments: ${deleted.count} removed, ${created} created.`,
      };
    } catch (error) {
      console.log(error);

      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      )
        throw error;
      throw new BadRequestException(
        'Failed to assign/remove class arm teacher',
      );
    }
  }

  async getClassArmTeacher(dto: GetClassArmTeacherDto, user) {
    const assignment = await this.prisma.classArmTeacherAssignment.findFirst({
      where: {
        classId: dto.classId,
        classArmId: dto.classArmId,
        schoolId: user.schoolId,
        isDeleted: false,
      },
      include: {
        staff: { include: { user: true } },
        class: true,
        classArm: true,
        school: true,
      },
    });
    if (!assignment) {
      throw new NotFoundException('No teacher assigned to this class arm');
    }
    return assignment;
  }

  async getSchoolTeachers(
    schoolId: string,
    query: { q?: string; page?: number; limit?: number },
  ) {
    const { q, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    // Build where clause
    const where: any = {
      user: {
        schoolId: schoolId,
        ...(q && {
          OR: [{ firstname: { contains: q } }, { lastname: { contains: q } }],
        }),
      },
    };
    // Fetch teachers with pagination
    const [teachers, total] = await Promise.all([
      this.prisma.staff.findMany({
        where,
        include: {
          user: true,
        },
        skip,
        take: limit,
      }),
      this.prisma.staff.count({ where }),
    ]);
    // Map to desired output
    const data = teachers.map((t) => ({
      id: t.id,
      firstname: t.user?.firstname,
      lastname: t.user?.lastname,
      // age: t.user?.age, // Remove age if not present in user model
    }));
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
