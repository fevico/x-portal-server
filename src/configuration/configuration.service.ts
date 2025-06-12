import { PrismaService } from '@/prisma/prisma.service';
import { HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { UpdateSchoolInfoDto } from './dto/configuration';
import { AuthenticatedUser } from '@/types/express';
import { v2 as cloudinary } from 'cloudinary';
import { uploadToCloudinary } from '@/utils';

@Injectable()
export class ConfigurationService {
  constructor(private prisma: PrismaService) {}

  async updateSchoolInformation(
    body: UpdateSchoolInfoDto,
    user: AuthenticatedUser,
    logo: Express.Multer.File,
  ) {
    const { address, color, country, email, name, state } = body;
    if (!user || !user.schoolId)
      throw new NotFoundException(
        'User not found or not associated with a school',
      );
    try {
      let imageUrl: string | undefined;
      let pubId: string | undefined;

      if (logo && logo.buffer) {
        // Use the reusable Cloudinary upload function with file buffer
        const uploadResult = await uploadToCloudinary(logo.buffer, {
          folder: 'school-logos',
          transformation: { width: 800, height: 800, crop: 'limit' },
        });
        imageUrl = uploadResult.imageUrl;
        pubId = uploadResult.pubId;
      }

      const schoolId = user.schoolId;
      const school = await this.prisma.school.update({
        where: { id: schoolId },
        data: {
          address,
          color,
          country,
          email,
          name,
          state,
          logo: imageUrl ? imageUrl : undefined,
        },
      });
      if (!school)
        throw new NotFoundException('School data not found for this user');
      return school;
    } catch (error) {
      throw new HttpException('Failed to update school information', 500);
    }
  }

  async addSchoolMarkingScheme(body: any, schoolId: string) {
    const { name, score, type } = body;

    if (!schoolId) throw new NotFoundException('School ID not provided');
    try {
      const school = await this.prisma.markingScheme.create({
        data: {
          name,
          score,
          type,
          school: { connect: { id: schoolId } },
        },
      });
      if (!school) throw new NotFoundException('School not found');
      return school;
    } catch (error) {
      throw new HttpException('Failed to update marking scheme', 500);
    }
  }

  addSchoolGradeScheme(body: any, schoolId: string) {
    const {
      scoreStartPoint,
      scoreEndPoint,
      remark,
      teacherComment,
      principalComment,
      markingSchemeId,
    } = body;

    if (!schoolId) throw new NotFoundException('School ID not provided');
    try {
      const school = this.prisma.gradeScheme.create({
        data: {
          markingSchemeId,
          scoreStartPoint,
          scoreEndPoint,
          remark,
          teacherComment,
          principalComment,
          school: { connect: { id: schoolId } },
        },
      });
      if (!school) throw new NotFoundException('School not found');
      return school;
    } catch (error) {
      throw new HttpException('Failed to update grade scheme', 500);
    }
  }
}
