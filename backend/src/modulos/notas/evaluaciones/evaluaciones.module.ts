import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AuditoriaModule } from '../../auditoria/auditoria.module';
import { AutenticacionModule } from '../../control-acceso/autenticacion/autenticacion.module';
import { NotificacionesModule } from '../../notificaciones/notificaciones.module';
import { FlujoNotasService } from '../comun/flujo-notas.service';
import { NotificacionesNotasService } from '../comun/notificaciones-notas.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { ConfiguracionEvaluacionesController } from './configuracion-evaluaciones.controller';
import { ConfiguracionEvaluacionesService } from './configuracion-evaluaciones.service';
import { ConsultasEvaluacionesController } from './consultas-evaluaciones.controller';
import { ConsultasEvaluacionesService } from './consultas-evaluaciones.service';
import { MateriasEvaluacionesController } from './materias-evaluaciones.controller';
import { MateriasEvaluacionesService } from './materias-evaluaciones.service';
import { NotasEvaluacionesController } from './notas-evaluaciones.controller';
import { NotasEvaluacionesService } from './notas-evaluaciones.service';
import { MatricesAcademicasController } from '../matrices-academicas/matrices-academicas.controller';
import { MatricesAcademicasService } from '../matrices-academicas/matrices-academicas.service';

@Module({
  imports: [
    PrismaModule,
    AutenticacionModule,
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [
    ConfiguracionEvaluacionesController,
    MateriasEvaluacionesController,
    NotasEvaluacionesController,
    ConsultasEvaluacionesController,
    MatricesAcademicasController,
  ],
  providers: [
    ValidacionesNotasService,
    NotificacionesNotasService,
    FlujoNotasService,
    ConfiguracionEvaluacionesService,
    MateriasEvaluacionesService,
    NotasEvaluacionesService,
    ConsultasEvaluacionesService,
    MatricesAcademicasService,
  ],
  exports: [MatricesAcademicasService],
})
export class EvaluacionesModule {}
