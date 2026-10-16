import { INestApplication, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NextFunction, Request, Response } from 'express';
import { PrismaExceptionFilter } from './common/prisma-exception.filter';

/** Shared by main.ts and the e2e tests so both run with identical settings. */
export function setupApp(app: INestApplication, corsOrigin?: string) {
  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new PrismaExceptionFilter());

  // Never let a browser/CDN cache API responses: the frontend must always show what the admin last saved.
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
  });

  app.enableCors({
    origin: corsOrigin ? corsOrigin.split(',').map((s) => s.trim()) : true,
  });

  const doc = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Revenue Dashboard API')
      .setDescription('Backend for the restaurant "Revenue Trend" dashboard')
      .setVersion('1.0')
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup('docs', app, doc);
}
