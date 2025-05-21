import { Injectable, BadRequestException } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { memoryStorage } from 'multer';
import { extname } from 'path';

@Injectable()
export class FileUploadMiddleware {
  static multerOptions: MulterOptions = {
    storage: memoryStorage(), // Store files in memory, not on disk
    fileFilter: (req, file, cb) => {
      const allowedTypes = /jpeg|jpg|png/;
      const mimetype = allowedTypes.test(file.mimetype);
      const ext = allowedTypes.test(extname(file.originalname).toLowerCase());

      if (mimetype && ext) {
        return cb(null, true);
      }
      cb(new BadRequestException('Only JPEG, JPG, or PNG images are allowed'), false);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB limit
    },
  };
}