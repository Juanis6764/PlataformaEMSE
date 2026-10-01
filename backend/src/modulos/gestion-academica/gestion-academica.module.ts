import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutenticacionModule } from '../control-acceso/autenticacion/autenticacion.module';
import { GestionAcademicaController } from './gestion-academica.controller';
import { GestionAcademicaService } from './gestion-academica.service';

/** Ensambla la API de gestiones y periodos académicos institucionales. */
@Module({
  imports: [PrismaModule, AutenticacionModule],
  controllers: [GestionAcademicaController],
  providers: [GestionAcademicaService],
  exports: [GestionAcademicaService],
})
export class GestionAcademicaModule {}
