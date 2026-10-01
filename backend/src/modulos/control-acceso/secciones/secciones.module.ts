import { Module } from '@nestjs/common';
import { SeccionesService } from './secciones.service';
import { SeccionesController } from './secciones.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';

@Module({
  imports: [PrismaModule, AutenticacionModule],
  controllers: [SeccionesController],
  providers: [SeccionesService],
  exports: [SeccionesService],
})
export class SeccionesModule {}
