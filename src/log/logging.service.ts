// import { Injectable } from '@nestjs/common';
// import { PrismaService } from '../prisma/prisma.service'; // Adjust path

// @Injectable()
// export class LoggingService {
//   constructor(private prisma: PrismaService) {}

//   async logAction(
//     action: string,
//     target: string,
//     targetId: string | null,
//     userId: string | null,
//     schoolId: string | null,
//     meta: Record<string, any> | null = null,
//   ) {
//     try {
//       await this.prisma.logEntry.create({
//         data: {
//           action,
//           target,
//           targetId,
//           userId,
//           schoolId,
//           meta,
//           timestamp: new Date(),
//         },
//       });
//     } catch (error) {
//       console.error('Failed to log action:', error);
//       // Swallow error to avoid breaking the main operation
//     }
//   }
// }

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path

@Injectable()
export class LoggingService {
  constructor(private prisma: PrismaService) {}  

  async logAction(
    action: string,
    target: string,
    targetId: string | null,
    userId: string | null,
    schoolId: string | null,
    meta: Record<string, any> | null = null,
  ) {
    try {
      // Sanitize and limit meta data
      const sanitizeMeta = (obj: any): any => {
        if (!obj) return null;
        const allowedKeys = ['email', 'name', 'id', 'action', 'username']; // Whitelist
        const maxLength = 500; // Reduced from 1000
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (!allowedKeys.includes(key)) continue; // Only allowed keys
          if (key === 'password' || key.includes('token')) continue; // Exclude sensitive
          if (typeof value === 'string' && value.length > maxLength) {
            sanitized[key] = value.slice(0, maxLength) + '...';
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeMeta(value); // Recursive
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      // Debug log input
      console.log('Logging action:', {
        action,
        target,
        targetId,
        userId,
        schoolId,
        meta: sanitizeMeta(meta),
      });

      await this.prisma.logEntry.create({
        data: {
          action,
          target,
          targetId,
          userId,
          schoolId,
          meta: sanitizeMeta(meta),
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('Failed to log action:', error);
      // Swallow error to avoid breaking main operation
    }
  }
}
