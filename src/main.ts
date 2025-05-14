import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import { LoggingService } from './log/logging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.LIVE_FRONTEND_URL],
    credentials: true,
  });

  const prismaService = app.get(PrismaService);
  const loggingService = app.get(LoggingService);

  // Prisma middleware for logging CRUD actions
  prismaService.$use(async (params, next) => {
    const { model, action, args } = params;

    if (['create', 'update', 'delete'].includes(action)) {
      const result = await next(params);

      let userId: string | null = null;
      let schoolId: string | null = null;
      let targetId: string | null = null;

      if (result && typeof result === 'object' && 'id' in result) {
        targetId = result.id;
      }

      if (args?.data) {
        userId =
          args.data.createdBy ||
          args.data.userId ||
          args.data.updatedBy ||
          null;
        schoolId = args.data.schoolId || null;
      }

      const actionMap: Record<string, string> = {
        create: `create_${model?.toLowerCase()}`,
        update: `update_${model?.toLowerCase()}`,
        delete: `delete_${model?.toLowerCase()}`,
      };

      // Re-use sanitizeMeta from LoggingService
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

      await loggingService.logAction(
        actionMap[action] || action,
        model || 'Unknown',
        targetId,
        userId,
        schoolId,
        {
          args: sanitizeMeta(args),
          result: sanitizeMeta(result),
        },
      );

      return result;
    }

    return next(params);
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());
  await app.listen(3000);
}
bootstrap();
