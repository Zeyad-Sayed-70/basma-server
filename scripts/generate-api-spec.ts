import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from '../src/app.module';
import { writeFileSync } from 'fs';
import { resolve } from 'path';

async function generate() {
  const app = await NestFactory.create(AppModule);

  const config = new DocumentBuilder()
    .setTitle('Basma API')
    .setDescription('Educational platform backend — multi-tenant, white-labeled')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  const specPath = resolve(process.cwd(), 'openapi-spec.json');
  writeFileSync(specPath, JSON.stringify(document, null, 2));

  console.log(`OpenAPI spec generated at ${specPath}`);
  await app.close();
}

generate();
