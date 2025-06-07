import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import {
  AcceptAdmissionDto,
  CreateAdmissionDto,
  RejectAdmissionDto,
  UpdateAdmissionDto,
} from './dto/addmission.dto';
import { generateRandomPassword, generateUniqueUsername } from '@/utils';
import { v2 as cloudinary } from 'cloudinary';
import { AuthenticatedUser } from '@/types/express';
import { AdmissionStatus } from '@prisma/client';

@Injectable()
export class AdmissionsService {
  constructor(private prisma: PrismaService) {}

  async createAdmission(dto: CreateAdmissionDto, req: any, image?: Express.Multer.File) {
    const {
      student,
      parent,
      formerSchool,
      otherInfo,
      sessionId,
      schoolId,
      presentClassId,
      classApplyingForId,
    } = dto;
    const requester = req.user;
  
    // Validate session and school
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.schoolId !== schoolId) {
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
  
    // Upload image to Cloudinary
    let imageUrl: string | undefined;
    let publicId: string | undefined;
    if (image) {
      const uploadResult = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'admissions', transformation: { width: 800, height: 800, crop: 'limit' } },
          (error, result) => {
            if (error) return reject(error);
            resolve(result);
          },
        );
        stream.end(image.buffer);
      });
      imageUrl = (uploadResult as any).secure_url;
      publicId = (uploadResult as any).public_id;
    }
  
    // Create users outside the transaction
    const studentUser = await this.prisma.user.create({
      data: {
        firstname: student.firstname,
        lastname: student.lastname,
        username: studentUsername,
        email: student.email,
        phone: student.contact,
        gender: student.gender,
        religion: student.religion,
        nationality: student.nationality,
        stateOfOrigin: student.stateOfOrigin,
        lga: student.lga,
        password: studentHashedPassword,
        plainPassword: studentPassword,
        role: 'admin',
        subRoleId: studentSubRole.id,
        schoolId,
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
        phone: parent.contact,
        password: parentHashedPassword,
        plainPassword: parentPassword,
        role: 'admin',
        subRoleId: parentSubRole.id,
        schoolId,
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
              admissionStatus: AdmissionStatus.pending,
              createdBy: requester?.id,
            },
          });
  
          // Create parent
          const parentRecord = await tx.parent.create({
            data: {
              userId: parentUser.id,
              address: parent.address,
              relationship: parent.relationship,
              createdBy: requester?.id,
            },
          });
  
          // Create admission with image URL
          const admission = await tx.admission.create({
            data: {
              sessionId,
              schoolId,
              studentId: studentRecord.id,
              parentId: parentRecord.id,
              presentClassId,
              classApplyingForId,
              homeAddress: student.homeAddress,
              contact: student.contact,
              email: student.email,
              dateOfBirth: student.dateOfBirth,
              religion: student.religion,
              nationality: student.nationality,
              stateOfOrigin: student.stateOfOrigin,
              lga: student.lga,
              parentLastname: parent.lastname,
              parentFirstname: parent.firstname,
              parentOthername: parent.othername,
              parentAddress: parent.address,
              parentContact: parent.contact,
              parentEmail: parent.email,
              parentRelationship: parent.relationship,
              formerSchoolName: formerSchool.name,
              formerSchoolAddress: formerSchool.address,
              formerSchoolContact: formerSchool.contact,
              healthProblems: otherInfo.healthProblems,
              howHeardAboutUs: otherInfo.howHeardAboutUs,
              imageUrl,
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
        { timeout: 30000 }
      );
    } catch (error) {
      // Clean up users if transaction fails
      await this.prisma.user.deleteMany({
        where: { id: { in: [studentUser.id, parentUser.id] } },
      });
      if (publicId) {
        await cloudinary.uploader.destroy(publicId);
      }
      throw error;
    }
  } 

  // async createAdmission(dto: CreateAdmissionDto, req: any, image?: Express.Multer.File) {
  //   const {
  //     student,
  //     parent,
  //     formerSchool,
  //     otherInfo,
  //     sessionId,
  //     schoolId,
  //     presentClassId,
  //     classApplyingForId,
  //   } = dto;
  //   const requester = req.user;
  
  //   // Validate session and school
  //   console.time('validateSession');
  //   const session = await this.prisma.session.findUnique({
  //     where: { id: sessionId },
  //   });
  //   if (!session || session.schoolId !== schoolId) {
  //     throw new ForbiddenException('Invalid session or school');
  //   }
  //   console.timeEnd('validateSession');
  
  //   // Find subroles
  //   console.time('findSubRoles');
  //   const studentSubRole = await this.prisma.subRole.findFirst({
  //     where: { name: 'student', isGlobal: true },
  //   });
  //   const parentSubRole = await this.prisma.subRole.findFirst({
  //     where: { name: 'parent', isGlobal: true },
  //   });
  //   if (!studentSubRole || !parentSubRole) {
  //     throw new ForbiddenException('Student or Parent subrole not found');
  //   }
  //   console.timeEnd('findSubRoles');
  
  //   // Generate usernames and passwords outside the transaction
  //   console.time('generateStudentUsername');
  //   const studentUsername = await generateUniqueUsername(student.firstname);
  //   console.timeEnd('generateStudentUsername');
  
  //   console.time('generateParentUsername');
  //   const parentUsername = await generateUniqueUsername(parent.firstname);
  //   console.timeEnd('generateParentUsername');
  
  //   console.time('generatePasswords');
  //   const studentPassword = await generateRandomPassword();
  //   const parentPassword = await generateRandomPassword();
  //   const studentHashedPassword = await bcrypt.hash(studentPassword, 10);
  //   const parentHashedPassword = await bcrypt.hash(parentPassword, 10);
  //   console.timeEnd('generatePasswords');
  
  //   // Upload image to Cloudinary if provided
  //   let imageUrl: string | undefined;
  //   let publicId: string | undefined;
  //   if (image) {
  //     console.time('cloudinaryUpload');
  //     try {
  //       const uploadResult = await new Promise((resolve, reject) => {
  //         const stream = cloudinary.uploader.upload_stream(
  //           { folder: 'admissions' },
  //           (error, result) => {
  //             if (error) return reject(error);
  //             resolve(result);
  //           },
  //         );
  //         stream.end(image.buffer);
  //       });
  //       imageUrl = (uploadResult as any).secure_url;
  //       publicId = (uploadResult as any).public_id;
  //     } catch (error) {
  //       throw new BadRequestException('Failed to upload image to Cloudinary');
  //     }
  //     console.timeEnd('cloudinaryUpload');
  //   }
  
  //   try {
  //     return await this.prisma.$transaction(
  //       async (tx) => {
  //         // Create student user
  //         console.time('createStudentUser');
  //         const studentUser = await tx.user.create({
  //           data: {
  //             firstname: student.firstname,
  //             lastname: student.lastname,
  //             username: studentUsername,
  //             email: student.email,
  //             phone: student.contact,
  //             gender: student.gender,
  //             religion: student.religion,
  //             nationality: student.nationality,
  //             stateOfOrigin: student.stateOfOrigin,
  //             lga: student.lga,
  //             password: studentHashedPassword,
  //             plainPassword: studentPassword,
  //             role: 'admin',
  //             subRoleId: studentSubRole.id,
  //             schoolId,
  //             createdBy: requester?.id,
  //           },
  //         });
  //         console.timeEnd('createStudentUser');
  
  //         // Create parent user
  //         console.time('createParentUser');
  //         const parentUser = await tx.user.create({
  //           data: {
  //             firstname: parent.firstname,
  //             lastname: parent.lastname,
  //             othername: parent.othername,
  //             username: parentUsername,
  //             email: parent.email,
  //             phone: parent.contact,
  //             password: parentHashedPassword,
  //             plainPassword: parentPassword,
  //             role: 'admin',
  //             subRoleId: parentSubRole.id,
  //             schoolId,
  //             createdBy: requester?.id,
  //           },
  //         });
  //         console.timeEnd('createParentUser');
  
  //         // Create student
  //         console.time('createStudent');
  //         const studentRecord = await tx.student.create({
  //           data: {
  //             userId: studentUser.id,
  //             studentRegNo: `STU-${Math.floor(Math.random() * 1000000)
  //               .toString()
  //               .padStart(6, '0')}`,
  //             dateOfBirth: student.dateOfBirth,
  //             admissionStatus: false,
  //             createdBy: requester?.id,
  //           },
  //         });
  //         console.timeEnd('createStudent');
  
  //         // Create parent
  //         console.time('createParent');
  //         const parentRecord = await tx.parent.create({
  //           data: {
  //             userId: parentUser.id,
  //             address: parent.address,
  //             relationship: parent.relationship,
  //             createdBy: requester?.id,
  //           },
  //         });
  //         console.timeEnd('createParent');
  
  //         // Create admission with image URL
  //         console.time('createAdmission');
  //         const admission = await tx.admission.create({
  //           data: {
  //             sessionId,
  //             schoolId,
  //             studentRegNo: studentRecord.id,
  //             parentId: parentRecord.id,
  //             presentClassId,
  //             classApplyingForId,
  //             homeAddress: student.homeAddress,
  //             contact: student.contact,
  //             email: student.email,
  //             dateOfBirth: student.dateOfBirth,
  //             religion: student.religion,
  //             nationality: student.nationality,
  //             stateOfOrigin: student.stateOfOrigin,
  //             lga: student.lga,
  //             parentLastname: parent.lastname,
  //             parentFirstname: parent.firstname,
  //             parentOthername: parent.othername,
  //             parentAddress: parent.address,
  //             parentContact: parent.contact,
  //             parentEmail: parent.email,
  //             parentRelationship: parent.relationship,
  //             formerSchoolName: formerSchool.name,
  //             formerSchoolAddress: formerSchool.address,
  //             formerSchoolContact: formerSchool.contact,
  //             healthProblems: otherInfo.healthProblems,
  //             howHeardAboutUs: otherInfo.howHeardAboutUs,
  //             // imageUrl,
  //             createdBy: requester?.id,
  //           },
  //         });
  //         console.timeEnd('createAdmission');
  
  //         // Update student with parent link
  //         console.time('updateStudent');
  //         await tx.student.update({
  //           where: { id: studentRecord.id },
  //           data: { parentId: parentRecord.id },
  //         });
  //         console.timeEnd('updateStudent');
  
  //         return { admission, studentPassword, parentPassword };
  //       },
  //       { timeout: 30000 }
  //     );
  //   } catch (error) {
  //     if (publicId) {
  //       await cloudinary.uploader.destroy(publicId);
  //     }
  //     throw error;
  //   }
  // }

  async rejectAdmission(id: string, dto: RejectAdmissionDto, req: any) {
    const { rejectionReason } = dto;
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
        'You can only reject admissions for your school',
      );
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update admission
      const updatedAdmission = await tx.admission.update({
        where: { id },
        data: {
          admissionStatus: AdmissionStatus.rejected,
          rejectionReason,
          updatedBy: requester.id,
          classId: null,
          classArmId: null,
        },
        include: {
          session: { select: { name: true } },
          school: { select: { name: true } },
          presentClass: { select: { name: true } },
          classApplyingFor: { select: { name: true } },
          class: { select: { name: true } },
          classArm: { select: { name: true } },
          student: {
            include: { user: { select: { firstname: true, lastname: true } } },
          },
        },
      });

      // Update student
      await tx.student.update({
        where: { id: admission.studentId },
        data: {
          admissionStatus: AdmissionStatus.rejected,
          classId: null,
          classArmId: null,
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

      return updatedAdmission;
    });
  }

  async acceptAdmission(id: string, dto: AcceptAdmissionDto, req: any) {
    const { classId, classArmId } = dto;
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
        'You can only accept admissions for your school',
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
    const classClassArm = await this.prisma.sessionClassClassArm.findFirst({
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
      const updatedAdmission = await tx.admission.update({
        where: { id },
        data: {
          admissionStatus: AdmissionStatus.accepted,
          classId,
          classArmId,
          admissionDate: new Date(),
          rejectionReason: null,
          updatedBy: requester.id,
        },
        include: {
          session: { select: { name: true } },
          school: { select: { name: true } },
          presentClass: { select: { name: true } },
          classApplyingFor: { select: { name: true } },
          class: { select: { name: true } },
          classArm: { select: { name: true } },
          student: {
            include: { user: { select: { firstname: true, lastname: true } } },
          },
        },
      });

      // Update student
      await tx.student.update({
        where: { id: admission.studentId },
        data: {
          admissionStatus: AdmissionStatus.accepted,
          classId,
          classArmId,
          admissionDate: new Date(),
          updatedBy: requester.id,
        },
      });

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

      return updatedAdmission;
    });
  }

  async updateAdmission(id: string, dto: UpdateAdmissionDto, req: any) {
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
        'You can only update admissions for your school',
      );
    }

    // Validate session and class IDs if provided
    if (dto.sessionId) {
      const session = await this.prisma.session.findUnique({
        where: { id: dto.sessionId },
      });
      if (!session || session.schoolId !== admission.schoolId) {
        throw new BadRequestException('Invalid session');
      }
    }
    if (dto.presentClassId || dto.classApplyingForId || dto.classId) {
      const classIds = [
        dto.presentClassId,
        dto.classApplyingForId,
        dto.classId,
      ].filter(Boolean);
      const classes = await this.prisma.class.findMany({
        where: { id: { in: classIds }, schoolId: admission.schoolId },
      });
      if (classes.length !== classIds.length) {
        throw new BadRequestException('Invalid class IDs');
      }
    }
    if (dto.classArmId) {
      const classArm = await this.prisma.classArm.findUnique({
        where: { id: dto.classArmId },
      });
      if (!classArm || classArm.schoolId !== admission.schoolId) {
        throw new BadRequestException('Invalid class arm');
      }
    }

    return await this.prisma.$transaction(async (tx) => {
      // Update admission
      const updatedAdmission = await tx.admission.update({
        where: { id },
        data: {
          sessionId: dto.sessionId,
          presentClassId: dto.presentClassId,
          classApplyingForId: dto.classApplyingForId,
          classId: dto.classId,
          classArmId: dto.classArmId,
          homeAddress: dto.student?.homeAddress,
          contact: dto.student?.contact,
          email: dto.student?.email,
          dateOfBirth: dto.student?.dateOfBirth,
          religion: dto.student?.religion,
          nationality: dto.student?.nationality,
          stateOfOrigin: dto.student?.stateOfOrigin,
          lga: dto.student?.lga,
          parentLastname: dto.parent?.lastname,
          parentFirstname: dto.parent?.firstname,
          parentOthername: dto.parent?.othername,
          parentAddress: dto.parent?.address,
          parentContact: dto.parent?.contact,
          parentEmail: dto.parent?.email,
          parentRelationship: dto.parent?.relationship,
          formerSchoolName: dto.formerSchool?.name,
          formerSchoolAddress: dto.formerSchool?.address,
          formerSchoolContact: dto.formerSchool?.contact,
          healthProblems: dto.otherInfo?.healthProblems,
          howHeardAboutUs: dto.otherInfo?.howHeardAboutUs,
          updatedBy: requester.id,
        },
        include: {
          session: { select: { name: true } },
          school: { select: { name: true } },
          presentClass: { select: { name: true } },
          classApplyingFor: { select: { name: true } },
          class: { select: { name: true } },
          classArm: { select: { name: true } },
          student: {
            include: { user: { select: { firstname: true, lastname: true } } },
          },
        },
      });

      // Optionally update student
      if (dto.student) {
        await tx.student.update({
          where: { id: admission.studentId },
          data: {
            dateOfBirth: dto.student.dateOfBirth,
            updatedBy: requester.id,
          },
        });
        await tx.user.update({
          where: { id: admission.student.userId },
          data: {
            firstname: dto.student.firstname,
            lastname: dto.student.lastname,
            email: dto.student.email,
            phone: dto.student.contact,
            gender: dto.student.gender,
            religion: dto.student.religion,
            nationality: dto.student.nationality,
            stateOfOrigin: dto.student.stateOfOrigin,
            lga: dto.student.lga,
            updatedBy: requester.id,
          },
        });
      }

      // Optionally update parent
      if (dto.parent) {
        await tx.parent.update({
          where: { id: admission.parentId },
          data: {
            address: dto.parent.address,
            relationship: dto.parent.relationship,
            updatedBy: requester.id,
          },
        });
        await tx.user.update({
          where: {
            id: (
              await tx.parent.findUnique({ where: { id: admission.parentId } })
            ).userId,
          },
          data: {
            firstname: dto.parent.firstname,
            lastname: dto.parent.lastname,
            othername: dto.parent.othername,
            email: dto.parent.email,
            phone: dto.parent.contact,
            updatedBy: requester.id,
          },
        });
      }

      // Log the action
      await tx.logEntry.create({
        data: {
          action: 'update_admission',
          target: 'Admission',
          targetId: id,
          userId: requester.id,
          schoolId: admission.schoolId,
          meta: { updatedFields: Object.keys(dto) },
          ipAddress: req.ip || '::1',
          device: req.headers['user-agent'] || 'Unknown',
          location: 'Localhost',
        },
      });

      return updatedAdmission;
    });
  }

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

  async getAdmissionDetails(id: string, user: AuthenticatedUser){
    const schoolId = user.schoolId;
    const admission = await this.prisma.admission.findUnique({
      where: { id, isDeleted: false },
      include:{school: { select: { name: true } },
      session: { select: { name: true } },
    } });
    if(!admission) {
      throw new NotFoundException('Admission data not found');
    }
    if( user.role !== 'admin' && admission.schoolId !== schoolId) {
      throw new ForbiddenException('You can only access admissions for your school');
    }
    return admission;      
  }
}
