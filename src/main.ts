import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cors from 'cors';
import * as dotenv from 'dotenv';
import * as bodyParser from 'body-parser';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Configurar bodyParser com limite customizado
  app.use(bodyParser.json({ limit: '50mb' })); // Ajuste o limite de tamanho conforme necessário
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
  // Configuração do CORS
  app.use(cors({
    origin: '*',
    methods: 'GET, HEAD, PUT, PATCH, POST, DELETE',
    credentials: true,
  }))

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
