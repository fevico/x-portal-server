import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });

  app.use(bodyParser.json({ limit: '10mb' }));
  app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

  app.enableCors({
    origin: [process.env.FRONTEND_URL, process.env.LIVE_FRONTEND_URL],
    credentials: true,
  });

  app.use(cookieParser());
  app.useGlobalPipes(new ValidationPipe());

  await app.listen(3000);
}
bootstrap();
