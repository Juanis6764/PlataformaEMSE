import { Module } from '@nestjs/common';
import { AsignacionesAcademicasService } from './asignaciones-academicas.service';
import { AsignacionesAcademicasController } from './asignaciones-academicas.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutenticacionModule } from '../control-acceso/autenticacion/autenticacion.module';

@Module({
  imports: [PrismaModule, AutenticacionModule],
  controllers: [AsignacionesAcademicasController],
  providers: [AsignacionesAcademicasService],
  exports: [AsignacionesAcademicasService],
})
export class AsignacionesAcademicasModule {}
