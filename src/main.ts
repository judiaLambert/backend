import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

import * as dotenv from 'dotenv';
dotenv.config();

console.log('🔧 Variables d\'environnement chargées:');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? '✅' : '❌ NON DÉFINI');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? '✅' : '❌ NON DÉFINI');

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Activez CORS
  app.enableCors({
    origin: 'http://localhost:5173', // URL de votre frontend React
    methods: ['GET', 'POST', 'PUT', 'DELETE','PATCH'],
    credentials: true,
  });
  await app.listen(3000);
}
bootstrap();
