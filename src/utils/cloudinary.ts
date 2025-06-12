import { v2 as cloudinary } from 'cloudinary';
import { BadRequestException } from '@nestjs/common';

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_KEY,
  api_secret: process.env.CLOUD_SECRET,
});

/**
 * Interface for the upload result
 */
export interface CloudinaryUploadResult {
  imageUrl: string;
  pubId: string;
}

/**
 * Options for the cloudinary upload
 */
export interface CloudinaryUploadOptions {
  folder?: string;
  transformation?: {
    width?: number;
    height?: number;
    crop?: string;
  };
}

/**
 * Upload a file to Cloudinary
 * @param imageData - Base64 string or file buffer
 * @param options - Upload options (folder, transformation, etc.)
 * @returns Promise with the secure URL and public ID
 */
export const uploadToCloudinary = async (
  imageData: string | Buffer,
  options: CloudinaryUploadOptions = { folder: 'uploads' },
): Promise<CloudinaryUploadResult> => {
  try {
    let buffer: Buffer;

    // Handle base64 string
    if (typeof imageData === 'string') {
      // Check if it's a base64 string
      if (imageData.includes('base64')) {
        // Extract the base64 data part (remove the data:image/xxx;base64, prefix)
        const base64Data = imageData.split(';base64,').pop();
        if (!base64Data) {
          throw new BadRequestException('Invalid base64 image format');
        }
        buffer = Buffer.from(base64Data, 'base64');
      } else {
        // Assume it's already a clean base64 string
        buffer = Buffer.from(imageData, 'base64');
      }
    } else if (Buffer.isBuffer(imageData)) {
      // Use the buffer directly if it's already a Buffer
      buffer = imageData;
    } else {
      throw new BadRequestException('Invalid image data format');
    }

    const uploadResult = await new Promise<any>((resolve, reject) => {
      const uploadOptions = {
        folder: options.folder || 'uploads',
        ...(options.transformation && {
          transformation: options.transformation,
        }),
      };

      const stream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        },
      );

      stream.end(buffer);
    });

    return {
      imageUrl: uploadResult.secure_url,
      pubId: uploadResult.public_id,
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw new BadRequestException('Failed to upload image to Cloudinary');
  }
};
