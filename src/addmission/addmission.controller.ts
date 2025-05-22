import { Body, Controller, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { AddmissionService } from './addmission.service';
import { CreateAdmissionDto, UpdateAdmissionDto } from './dto/addmission.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Admission } from '@prisma/client';

@Controller('addmission')
export class AddmissionController {
    constructor(private admissionService: AddmissionService) {}

    @Post()
    @UseInterceptors(FileInterceptor('file'))
    async createAdmission(
      @Body() dto: CreateAdmissionDto,
      @UploadedFile() file?: Express.Multer.File,
    ): Promise<Admission> {
      return this.admissionService.createAdmission(dto, file);
    }
  
    @Patch(':id')
    @UseInterceptors(FileInterceptor('file'))
    async updateAdmission(
      @Param('id') id: string,
      @Body() dto: UpdateAdmissionDto,
      @UploadedFile() file?: Express.Multer.File,
    ): Promise<Admission> {
      return this.admissionService.updateAdmission(id, dto, file);
    }
  
    @Patch(':id/accept')
    async acceptAdmission(@Param('id') id: string): Promise<Admission> {
      return this.admissionService.acceptAdmission(id);
    }
  
}
