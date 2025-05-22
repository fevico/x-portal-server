import { ConflictException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { Readable } from 'stream';
import { CreateAdmissionDto, UpdateAdmissionDto } from './dto/addmission.dto';
import { PrismaService } from '@/prisma/prisma.service';

@Injectable()
export class AddmissionService {
    constructor(private prisma: PrismaService) {}

    async createAdmission(dto: CreateAdmissionDto, file?: Express.Multer.File) {
        // Validate school
        const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
        if (!school) {
          throw new NotFoundException('School not found');
        }
    
        // Validate classApplying
        const classApplying = await this.prisma.class.findUnique({ where: { id: dto.classApplyingId } });
        if (!classApplying || classApplying.schoolId !== dto.schoolId) {
          throw new NotFoundException('Class applying not found or does not belong to the school');
        }
    
        // Validate presentClass (if provided)
        if (dto.presentClassId) {
          const presentClass = await this.prisma.class.findUnique({ where: { id: dto.presentClassId } });
          if (!presentClass || presentClass.schoolId !== dto.schoolId) {
            throw new NotFoundException('Present class not found or does not belong to the school');
          }
        }
    
        // Check for duplicate guardian email
        let guardian = await this.prisma.guardian.findUnique({ where: { email: dto.guardianEmail } });
        if (!guardian) {
          guardian = await this.prisma.guardian.create({
            data: {
              surname: dto.guardianSurname,
              middleName: dto.guardianMiddleName,
              email: dto.guardianEmail,
              phone: dto.guardianPhone,
              address: dto.guardianAddress,
            },
          });
        } else if (guardian.surname !== dto.guardianSurname || guardian.middleName !== dto.guardianMiddleName) {
          throw new ConflictException('Guardian email already exists with different details');
        }
    
        // Upload image to Cloudinary
        let imageUrl = '';
        if (file) {
          try {
            const stream = Readable.from(file.buffer);
            const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'student_images',
                  public_id: `admission_${dto.surname}_${Date.now()}`,
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result as UploadApiResponse);
                },
              );
              stream.pipe(uploadStream);
            });
            imageUrl = uploadResult.secure_url;
          } catch (error) {
            throw new InternalServerErrorException('Failed to upload image to Cloudinary');
          }
        }
    
        // Create admission
        return this.prisma.admission.create({
          data: {
            schoolId: dto.schoolId,
            presentClassId: dto.presentClassId,
            classApplyingId: dto.classApplyingId,
            surname: dto.surname,
            firstName: dto.firstName,
            address: dto.address,
            gender: dto.gender,
            phone: dto.phone,
            email: dto.email,
            dateOfBirth: new Date(dto.dateOfBirth),
            religion: dto.religion,
            nationality: dto.nationality,
            stateOfOrigin: dto.stateOfOrigin,
            localGovernment: dto.localGovernment,
            image: imageUrl,
            guardianId: guardian.id,
          },
          include: {
            school: { select: { id: true, name: true, email: true } },
            guardian: true,
            presentClass: true,
            classApplying: true,
          },
        });
      }
    
      async updateAdmission(id: string, dto: UpdateAdmissionDto, file?: Express.Multer.File) {
        const admission = await this.prisma.admission.findUnique({ where: { id } });
        if (!admission) {
          throw new NotFoundException('Admission not found');
        }
    
        const updateData: any = {};
    
        // Update student fields
        if (dto.surname) updateData.surname = dto.surname;
        if (dto.firstName) updateData.firstName = dto.firstName;
        if (dto.address) updateData.address = dto.address;
        if (dto.gender) updateData.gender = dto.gender;
        if (dto.phone) updateData.phone = dto.phone;
        if (dto.email) updateData.email = dto.email;
        if (dto.dateOfBirth) updateData.dateOfBirth = new Date(dto.dateOfBirth);
        if (dto.religion) updateData.religion = dto.religion;
        if (dto.nationality) updateData.nationality = dto.nationality;
        if (dto.stateOfOrigin) updateData.stateOfOrigin = dto.stateOfOrigin;
        if (dto.localGovernment) updateData.localGovernment = dto.localGovernment;
        if (dto.isDeleted !== undefined) updateData.isDeleted = dto.isDeleted;
    
        // Validate and update classes
        if (dto.presentClassId) {
          const presentClass = await this.prisma.class.findUnique({ where: { id: dto.presentClassId } });
          if (!presentClass || presentClass.schoolId !== admission.schoolId) {
            throw new NotFoundException('Present class not found or does not belong to the school');
          }
          updateData.presentClassId = dto.presentClassId;
        }
        if (dto.classApplyingId) {
          const classApplying = await this.prisma.class.findUnique({ where: { id: dto.classApplyingId } });
          if (!classApplying || classApplying.schoolId !== admission.schoolId) {
            throw new NotFoundException('Class applying not found or does not belong to the school');
          }
          updateData.classApplyingId = dto.classApplyingId;
        }
    
        // Update guardian
        if (dto.guardianEmail) {
          let guardian = await this.prisma.guardian.findUnique({ where: { email: dto.guardianEmail } });
          if (!guardian) {
            guardian = await this.prisma.guardian.create({
              data: {
                surname: dto.guardianSurname || admission.surname,
                middleName: dto.guardianMiddleName,
                email: dto.guardianEmail,
                phone: dto.guardianPhone,
                address: dto.guardianAddress,
              },
            });
          } else {
            await this.prisma.guardian.update({
              where: { id: guardian.id },
              data: {
                surname: dto.guardianSurname || guardian.surname,
                middleName: dto.guardianMiddleName,
                phone: dto.guardianPhone,
                address: dto.guardianAddress,
              },
            });
          }
          updateData.guardianId = guardian.id;
        }
    
        // Update image
        if (file) {
          try {
            const stream = Readable.from(file.buffer);
            const uploadResult: UploadApiResponse = await new Promise((resolve, reject) => {
              const uploadStream = cloudinary.uploader.upload_stream(
                {
                  folder: 'student_images',
                  public_id: `admission_${dto.surname || admission.surname}_${Date.now()}`,
                },
                (error, result) => {
                  if (error) reject(error);
                  else resolve(result as UploadApiResponse);
                },
              );
              stream.pipe(uploadStream);
            });
            updateData.image = uploadResult.secure_url;
          } catch (error) {
            throw new InternalServerErrorException('Failed to upload image to Cloudinary');
          }
        }
    
        return this.prisma.admission.update({
          where: { id },
          data: updateData,
          include: {
            school: { select: { id: true, name: true, email: true } },
            guardian: true,
            presentClass: true,
            classApplying: true,
          },
        });
      }
}
