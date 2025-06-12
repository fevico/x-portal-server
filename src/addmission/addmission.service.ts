import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  CreateAdmissionDto,
  // UpdateAdmissionDto,
  UpdateAdmissionStatusDto,
} from './dto/addmission.dto';
import {
  generateRandomPassword,
  generateUniqueUsername,
  uploadToCloudinary,
} from '@/utils';
import { AuthenticatedUser } from '@/types/express';
import { AdmissionStatus } from '@prisma/client';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  // get all admissions
  async getAllAdmissions(
    user: AuthenticatedUser,
    page: number = 1,
    limit: number = 10,
    q: string = '',
    status: string = '',
  ) {
    const skip = (page - 1) * limit;
    const schoolId = user.schoolId;

    // Base query conditions
    const where: any = {
      isDeleted: false,
    };

    // Add school filter for non-superAdmin users
    if (user.role !== 'superAdmin') {
      where.schoolId = schoolId;
    }

    // Add status filter if provided
    if (status) {
      where.admissionStatus = status;
    }

    // Add search filter if query string provided
    if (q) {
      where.OR = [
        { student: { user: { firstname: { contains: q } } } },
        { student: { user: { lastname: { contains: q } } } },
      ];
    }

    // Get total count for pagination
    const total = await this.prisma.admission.count({ where });

    // Get paginated admissions
    const admissions = await this.prisma.admission.findMany({
      where,
      skip,
      take: limit,
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        admissionDate: true,
        assignedClass: { select: { name: true } },
        student: {
          select: {
            dateOfBirth: true,
            user: {
              select: {
                firstname: true,
                lastname: true,
                gender: true,
                avatar: true,
              },
            },
          },
        },
        session: { select: { id: true, name: true } },
        presentClass: { select: { name: true } },
        classToApply: { select: { name: true } },
      },
    });

    // Calculate pagination metadata
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPreviousPage = page > 1;

    // Transform nested data into flat structure
    const flattenedAdmissions = admissions.map((admission) => ({
      id: admission.id,
      imageUrl:
        (admission.student.user.avatar as { imageUrl?: string })?.imageUrl ||
        '',
      firstname: admission.student?.user?.firstname || '',
      lastname: admission.student?.user?.lastname || '',
      dateOfBirth: admission.student?.dateOfBirth || null,
      gender: admission.student?.user?.gender || null,
      session: admission.session?.name || '',
      sessionId: admission.session?.id || '',
      presentClass: admission.presentClass?.name || '',
      classToApply: admission.classToApply?.name || '',
      admissionDate: admission.admissionDate || null,
      assignedClass: admission.assignedClass?.name || null,
    }));

    return {
      data: flattenedAdmissions,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPreviousPage,
      },
    };
  }

  async createAdmission(
    dto: CreateAdmissionDto,
    req: any,
    image?: Express.Multer.File,
  ) {
    const {
      student,
      parent,
      formerSchool,
      otherInfo,
      sessionId,
      presentClassId,
      classApplyingTo,
      imageBase64,
    } = dto;
    const requester = req.user;

    // Validate session and school
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.schoolId !== requester.schoolId) {
      throw new ForbiddenException('Invalid session or school');
    }

    // Find subroles
    const studentSubRole = await this.prisma.subRole.findFirst({
      where: { name: 'student', isGlobal: true },
    });
    const parentSubRole = await this.prisma.subRole.findFirst({
      where: { name: 'parent', isGlobal: true },
    });
    if (!studentSubRole || !parentSubRole) {
      throw new ForbiddenException('Student or Parent subrole not found');
    }

    // Generate usernames and passwords
    const studentUsername = await generateUniqueUsername(student.firstname);
    const parentUsername = await generateUniqueUsername(parent.firstname);
    const studentPassword = await generateRandomPassword();
    const parentPassword = await generateRandomPassword();
    const studentHashedPassword = await bcrypt.hash(studentPassword, 10);
    const parentHashedPassword = await bcrypt.hash(parentPassword, 10);

    // Upload image to Cloudinary - handle both file upload and base64 string
    let imageUrl: string | undefined;
    let pubId: string | undefined;
    try {
      if (image) {
        // Use the reusable Cloudinary upload function with file buffer
        const uploadResult = await uploadToCloudinary(image.buffer, {
          folder: 'admissions',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        imageUrl = uploadResult.imageUrl;
        pubId = uploadResult.pubId;
      } else if (imageBase64) {
        // Use the reusable Cloudinary upload function with base64 string
        const uploadResult = await uploadToCloudinary(imageBase64, {
          folder: 'admissions',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        imageUrl = uploadResult.imageUrl;
        pubId = uploadResult.pubId;
      }
    } catch (error) {
      console.error('Image upload error:', error);
      throw new BadRequestException('Failed to upload image to Cloudinary');
    }

    // Create users outside the transaction
    const studentUser = await this.prisma.user.create({
      data: {
        firstname: student.firstname,
        lastname: student.lastname,
        username: studentUsername,
        email: student.email,
        contact: student.contact,
        gender: student.gender,
        password: studentHashedPassword,
        plainPassword: studentPassword,
        role: 'admin',
        subRoleId: studentSubRole.id,
        schoolId: requester.schoolId,
        avatar: { imageUrl, pubId },
        createdBy: requester?.id,
      },
    });

    const parentUser = await this.prisma.user.create({
      data: {
        firstname: parent.firstname,
        lastname: parent.lastname,
        othername: parent.othername,
        username: parentUsername,
        email: parent.email,
        contact: parent.contact,
        password: parentHashedPassword,
        plainPassword: parentPassword,
        role: 'admin',
        subRoleId: parentSubRole.id,
        schoolId: requester.schoolId,
        createdBy: requester?.id,
      },
    });

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          // Create student
          const studentRecord = await tx.student.create({
            data: {
              userId: studentUser.id,
              studentRegNo: student.studentRegNo,
              dateOfBirth: student.dateOfBirth,
              religion: student.religion,
              nationality: student.nationality,
              stateOfOrigin: student.stateOfOrigin,
              lga: student.lga,
              admissionStatus: AdmissionStatus.pending,
              createdBy: requester?.id,
            },
          });

          // Create parent
          const parentRecord = await tx.parent.create({
            data: {
              userId: parentUser.id,
              relationship: parent.relationship,
              occupation: parent.occupation,
              createdBy: requester?.id,
            },
          });

          // Create admission with image URL
          const admission = await tx.admission.create({
            data: {
              sessionId,
              schoolId: requester.schoolId,
              studentId: studentRecord.id,
              parentId: parentRecord.id,
              presentClassId,
              classApplyingTo,
              formerSchoolName: formerSchool.name,
              formerSchoolAddress: formerSchool.address,
              formerSchoolContact: formerSchool.contact,
              healthProblems: otherInfo.healthProblems,
              howHeardAboutUs: otherInfo.howHeardAboutUs,
              createdBy: requester?.id,
            },
          });

          // Update student with parent link
          await tx.student.update({
            where: { id: studentRecord.id },
            data: { parentId: parentRecord.id },
          });

          return { admission, studentPassword, parentPassword };
        },
        { timeout: 30000 },
      );
    } catch (error) {
      // Clean up users if transaction fails
      await this.prisma.user.deleteMany({
        where: { id: { in: [studentUser.id, parentUser.id] } },
      });
      if (pubId) {
        await cloudinary.uploader.destroy(pubId);
      }
      throw error;
    }
  }

  async updateAdmissionStatus(
    id: string,
    dto: UpdateAdmissionStatusDto,
    req: any,
  ) {
    const { status, classId, classArmId, rejectionReason } = dto;
    const requester = req.user;

    // Validate admission
    const admission = await this.prisma.admission.findUnique({
      where: { id, isDeleted: false },
      include: { student: true },
    });
    if (!admission) {
      throw new NotFoundException('Admission not found');
    }

    // Validate permissions
    if (
      requester.role !== 'superAdmin' &&
      requester.schoolId !== admission.schoolId
    ) {
      throw new ForbiddenException(
        'You can only manage admissions for your school',
      );
    }

    if (status === 'accepted') {
      // Validate required fields for acceptance
      if (!classId || !classArmId) {
        throw new BadRequestException(
          'Class ID and Class Arm ID are required for acceptance',
        );
      }

      // Validate class and class arm
      const classRecord = await this.prisma.class.findUnique({
        where: { id: classId },
      });
      const classArmRecord = await this.prisma.classArm.findUnique({
        where: { id: classArmId },
      });
      if (!classRecord || classRecord.schoolId !== admission.schoolId) {
        throw new BadRequestException('Invalid class ID');
      }
      if (!classArmRecord || classArmRecord.schoolId !== admission.schoolId) {
        throw new BadRequestException('Invalid class arm ID');
      }

      // Validate class-class arm compatibility
      const classClassArm = await this.prisma.sessionClassAssignment.findFirst({
        where: {
          classId,
          classArmId,
          sessionId: admission.sessionId,
          schoolId: admission.schoolId,
          isDeleted: false,
        },
      });
      if (!classClassArm) {
        throw new BadRequestException('Class and class arm are not linked');
      }

      return await this.prisma.$transaction(async (tx) => {
        // Update admission
        await tx.admission.update({
          where: { id },
          data: {
            admissionStatus: AdmissionStatus.accepted,
            assignedClassId: classId,
            assignedClassArmId: classArmId,
            admissionDate: new Date(),
            rejectionReason: null,
            updatedBy: requester.id,
          },
        });

        // Update student
        await tx.student.update({
          where: { id: admission.studentId },
          data: {
            admissionStatus: AdmissionStatus.accepted,
            admissionDate: new Date(),
            updatedBy: requester.id,
          },
        });

        // create class assignment record
        await tx.studentClassAssignment.create({
          data: {
            studentId: admission.studentId,
            classId,
            classArmId,
            sessionId: admission.sessionId,
            schoolId: admission.schoolId,
            createdBy: requester.id,
            // updatedBy: requester.id,
          },
        });

        // update student with subject assignments we fetch subjects from classarmsubjectassignment using the students classid and classarmid and create a recird in StudentSubjectAssignment make sure it is for the current school
        const subjects = await tx.classArmSubjectAssignment.findMany({
          where: {
            classId,
            classArmId,
            schoolId: admission.schoolId,
          },
          select: { subjectId: true, id: true },
        });

        if (subjects.length > 0) {
          const studentSubjectAssignments = subjects.map((subj) => ({
            studentId: admission.studentId,
            subjectId: subj.subjectId,
            classId,
            classArmId,
            sessionId: admission.sessionId,
            schoolId: admission.schoolId,
            classArmSubjectId: subj.id,
            createdBy: requester.id,
          }));
          await tx.studentSubjectAssignment.createMany({
            data: studentSubjectAssignments,
          });
        }
        // Log the action
        await tx.logEntry.create({
          data: {
            action: 'accept_admission',
            target: 'Admission',
            targetId: id,
            userId: requester.id,
            schoolId: admission.schoolId,
            meta: { classId, classArmId },
            ipAddress: req.ip || '::1',
            device: req.headers['user-agent'] || 'Unknown',
            location: 'Localhost',
          },
        });

        return { message: 'Admission accepted successfully' };
      });
    } else if (status === 'rejected') {
      return await this.prisma.$transaction(async (tx) => {
        // Update admission
        await tx.admission.update({
          where: { id },
          data: {
            admissionStatus: AdmissionStatus.rejected,
            rejectionReason,
            admissionDate: new Date(),
            updatedBy: requester.id,
            assignedClassId: null,
            assignedClassArmId: null,
          },
        });

        // Update student
        await tx.student.update({
          where: { id: admission.studentId },
          data: {
            admissionStatus: AdmissionStatus.rejected,
            admissionDate: null,
            updatedBy: requester.id,
          },
        });

        // Log the action
        await tx.logEntry.create({
          data: {
            action: 'reject_admission',
            target: 'Admission',
            targetId: id,
            userId: requester.id,
            schoolId: admission.schoolId,
            meta: { rejectionReason },
            ipAddress: req.ip || '::1',
            device: req.headers['user-agent'] || 'Unknown',
            location: 'Localhost',
          },
        });

        return { message: 'Admission rejected successfully' };
      });
    } else {
      throw new BadRequestException(
        'Invalid status. Must be either "accepted" or "rejected"',
      );
    }
  }

  // async updateAdmission(id: string, dto: UpdateAdmissionDto, req: any) {
  //   const requester = req.user;

  //   // Validate admission
  //   const admission = await this.prisma.admission.findUnique({
  //     where: { id, isDeleted: false },
  //     include: { student: true },
  //   });
  //   if (!admission) {
  //     throw new NotFoundException('Admission not found');
  //   }

  //   // Validate permissions
  //   if (
  //     requester.role !== 'superAdmin' &&
  //     requester.schoolId !== admission.schoolId
  //   ) {
  //     throw new ForbiddenException(
  //       'You can only update admissions for your school',
  //     );
  //   }

  //   // Validate session and class IDs if provided
  //   if (dto.sessionId) {
  //     const session = await this.prisma.session.findUnique({
  //       where: { id: dto.sessionId },
  //     });
  //     if (!session || session.schoolId !== admission.schoolId) {
  //       throw new BadRequestException('Invalid session');
  //     }
  //   }
  //   if (dto.presentClassId || dto.classApplyingForId || dto.classId) {
  //     const classIds = [
  //       dto.presentClassId,
  //       dto.classApplyingForId,
  //       dto.classId,
  //     ].filter(Boolean);
  //     const classes = await this.prisma.class.findMany({
  //       where: { id: { in: classIds }, schoolId: admission.schoolId },
  //     });
  //     if (classes.length !== classIds.length) {
  //       throw new BadRequestException('Invalid class IDs');
  //     }
  //   }
  //   if (dto.classArmId) {
  //     const classArm = await this.prisma.classArm.findUnique({
  //       where: { id: dto.classArmId },
  //     });
  //     if (!classArm || classArm.schoolId !== admission.schoolId) {
  //       throw new BadRequestException('Invalid class arm');
  //     }
  //   }

  //   return await this.prisma.$transaction(async (tx) => {
  //     // Update admission
  //     const updatedAdmission = await tx.admission.update({
  //       where: { id },
  //       data: {
  //         sessionId: dto.sessionId,
  //         presentClassId: dto.presentClassId,
  //         classApplyingTo: dto.classApplyingTo,
  //         assignedClassId: dto.classId,
  //         assignedClassArmId: dto.classArmId,
  //         formerSchoolName: dto.formerSchool?.name,
  //         formerSchoolAddress: dto.formerSchool?.address,
  //         formerSchoolContact: dto.formerSchool?.contact,
  //         healthProblems: dto.otherInfo?.healthProblems,
  //         howHeardAboutUs: dto.otherInfo?.howHeardAboutUs,
  //         updatedBy: requester.id,
  //       },
  //       include: {
  //         session: { select: { name: true } },
  //         school: { select: { name: true } },
  //         presentClass: { select: { name: true } },
  //         classApplyingFor: { select: { name: true } },
  //         class: { select: { name: true } },
  //         classArm: { select: { name: true } },
  //         student: {
  //           include: { user: { select: { firstname: true, lastname: true } } },
  //         },
  //       },
  //     });

  //     // Optionally update student
  //     if (dto.student) {
  //       await tx.student.update({
  //         where: { id: admission.studentId },
  //         data: {
  //           dateOfBirth: dto.student.dateOfBirth,
  //           updatedBy: requester.id,
  //         },
  //       });
  //       await tx.user.update({
  //         where: { id: admission.student.userId },
  //         data: {
  //           firstname: dto.student.firstname,
  //           lastname: dto.student.lastname,
  //           email: dto.student.email,
  //           phone: dto.student.contact,
  //           gender: dto.student.gender,
  //           religion: dto.student.religion,
  //           nationality: dto.student.nationality,
  //           stateOfOrigin: dto.student.stateOfOrigin,
  //           lga: dto.student.lga,
  //           updatedBy: requester.id,
  //         },
  //       });
  //     }

  //     // Optionally update parent
  //     if (dto.parent) {
  //       await tx.parent.update({
  //         where: { id: admission.parentId },
  //         data: {
  //           address: dto.parent.address,
  //           relationship: dto.parent.relationship,
  //           updatedBy: requester.id,
  //         },
  //       });
  //       await tx.user.update({
  //         where: {
  //           id: (
  //             await tx.parent.findUnique({ where: { id: admission.parentId } })
  //           ).userId,
  //         },
  //         data: {
  //           firstname: dto.parent.firstname,
  //           lastname: dto.parent.lastname,
  //           othername: dto.parent.othername,
  //           email: dto.parent.email,
  //           phone: dto.parent.contact,
  //           updatedBy: requester.id,
  //         },
  //       });
  //     }

  //     // Log the action
  //     await tx.logEntry.create({
  //       data: {
  //         action: 'update_admission',
  //         target: 'Admission',
  //         targetId: id,
  //         userId: requester.id,
  //         schoolId: admission.schoolId,
  //         meta: { updatedFields: Object.keys(dto) },
  //         ipAddress: req.ip || '::1',
  //         device: req.headers['user-agent'] || 'Unknown',
  //         location: 'Localhost',
  //       },
  //     });

  //     return updatedAdmission;
  //   });
  // }

  async getStudentsByParentId(parentId: string, req: any) {
    const requester = req.user;

    // Validate parent
    const parent = await this.prisma.parent.findUnique({
      where: { id: parentId },
      include: {
        user: {
          select: {
            schoolId: true,
            firstname: true,
            lastname: true,
            email: true,
          },
        },
        students: {
          include: {
            user: { select: { firstname: true, lastname: true, email: true } },
            class: { select: { name: true } },
            classArm: { select: { name: true } },
            admission: { select: { admissionStatus: true } },
          },
        },
      },
    });

    if (!parent) {
      throw new NotFoundException('Parent not found');
    }

    // Validate permissions
    if (
      requester.role !== 'superAdmin' &&
      requester.schoolId !== parent.user.schoolId
    ) {
      throw new ForbiddenException(
        'You can only access students for your school',
      );
    }

    return {
      parentId: parent.id,
      parentUser: {
        firstname: parent.user.firstname,
        lastname: parent.user.lastname,
        email: parent.user.email,
      },
      students: parent.students.map((student) => ({
        id: student.id,
        studentRegNo: student.studentRegNo,
        firstname: student.user.firstname,
        lastname: student.user.lastname,
        email: student.user.email,
        class: student.class?.name,
        classArm: student.classArm?.name,
        admissionStatus: student.admission?.admissionStatus,
      })),
    };
  }

  async getAdmissionDetails(id: string, user: AuthenticatedUser) {
    const schoolId = user.schoolId;
    const admission = await this.prisma.admission.findUnique({
      where: { id, isDeleted: false },
      select: {
        id: true,
        formerSchoolName: true,
        formerSchoolAddress: true,
        formerSchoolContact: true,
        healthProblems: true,
        howHeardAboutUs: true,
        admissionStatus: true,
        admissionDate: true,
        rejectionReason: true,
        createdAt: true,
        schoolId: true,
        classToApply: {
          select: { id: true, name: true },
        },
        // Related models
        school: { select: { id: true, name: true } },
        session: { select: { id: true, name: true } },
        presentClass: { select: { id: true, name: true } },
        assignedClass: { select: { id: true, name: true } },
        assignedClassArm: { select: { id: true, name: true } },
        parent: {
          select: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                othername: true,
                address: true,
                contact: true,
                email: true,
              },
            },
            relationship: true,
            occupation: true,
          },
        },
        student: {
          select: {
            user: {
              select: {
                firstname: true,
                lastname: true,
                gender: true,
                avatar: true,
                email: true,
                contact: true,
                address: true,
              },
            },
            dateOfBirth: true,
            religion: true,
            nationality: true,
            stateOfOrigin: true,
            lga: true,
          },
        },
      },
    });

    if (!admission) {
      throw new NotFoundException('Admission data not found');
    }

    if (user.role !== 'admin' && admission.schoolId !== schoolId) {
      throw new ForbiddenException(
        'You can only access admissions for your school',
      );
    }

    // Transform data into the exact requested format
    const formattedAdmission = {
      id: admission.id,
      status: admission.admissionStatus,
      rejectionReason: admission.rejectionReason || '',
      student: {
        firstname: admission.student?.user?.firstname || '',
        lastname: admission.student?.user?.lastname || '',
        email: admission.student.user.email || '',
        gender: admission.student?.user?.gender || null,
        dateOfBirth: admission.student.dateOfBirth,
        sessionId: admission.session?.id || '',
        sessionName: admission.session?.name || '',
        presentClassId: admission.presentClass?.id || '',
        presentClassName: admission.presentClass?.name || '',
        classApplyingForId: admission.classToApply?.id || '',
        classApplyingForName: admission.classToApply?.name || '',
        homeAddress: admission.student.user.address || '',
        contact: admission.student.user.contact || '',
        religion: admission.student.religion || '',
        nationality: admission.student.nationality || '',
        stateOfOrigin: admission.student.stateOfOrigin || '',
        lga: admission.student.lga || '',
        imageUrl:
          (admission.student.user.avatar as { imageUrl?: string })?.imageUrl ||
          '',
      },
      guardian: {
        lastName: admission.parent.user.lastname || '',
        firstName: admission.parent.user.firstname || '',
        otherName: admission.parent.user.othername || '',
        address: admission.parent.user.address || '',
        tel: admission.parent.user.contact || '',
        email: admission.parent.user.email || '',
        relationship: admission.parent.relationship || '',
        occupation: admission.parent.occupation || '',
      },
      formerSchool: {
        name: admission.formerSchoolName || '',
        address: admission.formerSchoolAddress || '',
        contact: admission.formerSchoolContact || '',
      },
      otherInfo: {
        specialHealthProblems: admission.healthProblems || '',
        howHeardAboutUs: admission.howHeardAboutUs || '',
      },
      createdAt: admission.createdAt,
    };

    return formattedAdmission;
  }
}
