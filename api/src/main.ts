import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { setupApp } from './setup-app';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  setupApp(app, process.env.CORS_ORIGIN);
  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  console.log(`API ready:  http://localhost:${port}/api`);
  console.log(`Swagger UI: http://localhost:${port}/docs`);
}
bootstrap();
