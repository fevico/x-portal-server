import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Adjust path
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { UAParser } from 'ua-parser-js';

@Injectable()
export class LoggingService {
  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async logAction(
    action: string,
    target: string,
    targetId: string | null,
    userId: string | null,
    schoolId: string | null,
    meta: Record<string, any> | null = null,
    req?: any, // Optional request object (Express Request)
  ) {
    try {
      // Sanitize and limit meta data
      const sanitizeMeta = (obj: any): any => {
        if (!obj) return null;
        const allowedKeys = ['email', 'name', 'id', 'action', 'username'];
        const maxLength = 500;
        const sanitized: any = {};
        for (const [key, value] of Object.entries(obj)) {
          if (!allowedKeys.includes(key)) continue;
          if (key === 'password' || key.includes('token')) continue;
          if (typeof value === 'string' && value.length > maxLength) {
            sanitized[key] = value.slice(0, maxLength) + '...';
          } else if (typeof value === 'object' && value !== null) {
            sanitized[key] = sanitizeMeta(value);
          } else {
            sanitized[key] = value;
          }
        }
        return sanitized;
      };

      // Extract IP address
      const ipAddress = req
        ? (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
          req.ip ||
          req.connection.remoteAddress
        : null;

      // Extract device from User-Agent
      let device = null;
      if (req && req.headers['user-agent']) {
        const parser = new UAParser(req.headers['user-agent']); // Instantiate with default export
        const result = parser.getResult();
        device = `${result.browser.name || 'Unknown'} on ${result.os.name || 'Unknown'}`;
      }

      // Fetch location from IP (optional, can be skipped if no IP)
      let location = null;
      if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        try {
          const response = await firstValueFrom(
            this.httpService.get(`http://ip-api.com/json/${ipAddress}`),
          );
          const data = response.data;
          if (data.status === 'success') {
            location = `${data.city || 'Unknown'}, ${data.country || 'Unknown'}`;
          }
        } catch (error) {
          console.warn('Failed to fetch location:', error.message);
          location = 'Unknown';
        }
      }

      await this.prisma.logEntry.create({
        data: {
          action,
          target,
          targetId,
          userId,
          schoolId,
          meta: sanitizeMeta(meta),
          timestamp: new Date(),
          ipAddress,
          device,
          location,
        },
      });
    } catch (error) {
      console.error('Failed to log action:', error);
      // Swallow error to avoid breaking main operation
    }
  }

  async getLogs(user: any, options: { skip?: number; take?: number } = {}) {
    try {
      const { schoolId, role } = user;
      const { skip = 0, take = 20 } = options;

      // Define base where clause
      const where =
        role === 'superAdmin'
          ? { isDeleted: false }
          : { schoolId, isDeleted: false };

      // Validate schoolId for non-superAdmin
      if (role !== 'superAdmin' && !schoolId) {
        throw new ForbiddenException('User is not associated with a school');
      }

      // Fetch logs and total count
      const [logs, total] = await Promise.all([
        this.prisma.logEntry.findMany({
          where,
          skip,
          take,
          orderBy: { timestamp: 'desc' },
          include: {
            user: { select: { id: true, firstname: true, lastname: true } },
            school: { select: { id: true, name: true } },
          },
        }),
        this.prisma.logEntry.count({ where }),
      ]);

      return { logs, total };
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      throw error instanceof ForbiddenException
        ? error
        : new Error(`Failed to fetch logs: ${error.message}`);
    }
  }
}
