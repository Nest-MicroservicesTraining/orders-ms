import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { envs } from './config/envs';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  // const app = await NestFactory.create(AppModule);
  const app = await NestFactory.createMicroservice<MicroserviceOptions>(
    AppModule,
    {
      transport: Transport.TCP,
      options: {
        port: envs.PORT,
      },
    },
  );

  app.useGlobalPipes(
    new ValidationPipe({
      // ! Remueve los datos que van de más en el body de la request
      // ! Y unicamente envía lo que se ha especificado en el DTO
      whitelist: true,

      // ! Si hay datos de más en el body de la request tira un error
      // ! Indicando que la propiedad no debería de existir
      forbidNonWhitelisted: true,

      // ! Excluye los campos undefined
      transformOptions: {
        exposeUnsetFields: false,
        // enableImplicitConversion: true,
      },
      transform: true,
    }),
  );

  await app.listen();
  logger.log(`Microservice is running on port ${envs.PORT}`);
}

bootstrap()
  .then(() => {
    logger.log('Application is ready');
  })
  .catch((error) => {
    logger.error('Error starting server', error);
    process.exit(1);
  });
