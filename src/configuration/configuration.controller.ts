import {
  Body,
  Controller,
  NotFoundException,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ConfigurationService } from './configuration.service';
import { UpdateSchoolInfoDto } from './dto/configuration';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guards';
import { Request as RequestExpress } from 'express';
import { AuthenticatedUser } from '@/types/express';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('configuration')
export class ConfigurationController {
  constructor(private configurationService: ConfigurationService) {}

  @Patch('school-information')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('logo'))
  async updateSchoolInformation(
    @Body() body: UpdateSchoolInfoDto,
    @Request() req: RequestExpress,
    @UploadedFile() logo?: Express.Multer.File,
  ) {
    const user = req.user as AuthenticatedUser;
    return this.configurationService.updateSchoolInformation(body, user, logo);
  }

  @Post('school-marking-scheme')
  @UseGuards(JwtAuthGuard)
  async addSchoolMarkingScheme(
    @Body() body: any,
    @Request() req: RequestExpress,
  ) {
    const user = req.user as AuthenticatedUser;
    if (!user || !user.schoolId)
      throw new NotFoundException(
        'User not found or not associated with a school',
      );
    return this.configurationService.addSchoolMarkingScheme(
      body,
      user.schoolId,
    );
  }
}
