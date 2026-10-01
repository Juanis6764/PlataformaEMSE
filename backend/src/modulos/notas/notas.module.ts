import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AutenticacionModule } from '../control-acceso/autenticacion/autenticacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { FlujoNotasService } from './comun/flujo-notas.service';
import { NotificacionesNotasService } from './comun/notificaciones-notas.service';
import { ValidacionesNotasService } from './comun/validaciones-notas.service';
import { CatalogoDisciplinaController } from './disciplina/catalogo-disciplina.controller';
import { CatalogoDisciplinaService } from './disciplina/catalogo-disciplina.service';
import { ConfiguracionDisciplinaController } from './disciplina/configuracion-disciplina.controller';
import { ConfiguracionDisciplinaService } from './disciplina/configuracion-disciplina.service';
import { ConsultasDisciplinaController } from './disciplina/consultas-disciplina.controller';
import { ConsultasDisciplinaService } from './disciplina/consultas-disciplina.service';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module';
import { OficialDisciplinaController } from './disciplina/oficial-disciplina.controller';
import { OficialDisciplinaService } from './disciplina/oficial-disciplina.service';
import { RegistrosDisciplinaController } from './disciplina/registros-disciplina.controller';
import { RegistrosDisciplinaService } from './disciplina/registros-disciplina.service';
import { ResultadosFinalesDisciplinaController } from './disciplina/resultados-finales-disciplina.controller';
import { ResultadosFinalesDisciplinaService } from './disciplina/resultados-finales-disciplina.service';
import { SemanasDisciplinaController } from './disciplina/semanas-disciplina.controller';
import { SemanasDisciplinaService } from './disciplina/semanas-disciplina.service';
import { EntrenamientoFisicoController } from './entrenamiento-fisico/entrenamiento-fisico.controller';
import { EntrenamientoFisicoService } from './entrenamiento-fisico/entrenamiento-fisico.service';

@Module({
  imports: [
    PrismaModule,
    AutenticacionModule,
    AuditoriaModule,
    NotificacionesModule,
    EvaluacionesModule,
  ],
  controllers: [
    ConfiguracionDisciplinaController,
    OficialDisciplinaController,
    CatalogoDisciplinaController,
    SemanasDisciplinaController,
    RegistrosDisciplinaController,
    ResultadosFinalesDisciplinaController,
    ConsultasDisciplinaController,
    EntrenamientoFisicoController,
  ],
  providers: [
    ValidacionesNotasService,
    NotificacionesNotasService,
    FlujoNotasService,
    ConfiguracionDisciplinaService,
    OficialDisciplinaService,
    CatalogoDisciplinaService,
    SemanasDisciplinaService,
    RegistrosDisciplinaService,
    ResultadosFinalesDisciplinaService,
    ConsultasDisciplinaService,
    EntrenamientoFisicoService,
  ],
  exports: [
    ValidacionesNotasService,
    NotificacionesNotasService,
    FlujoNotasService,
  ],
})
export class NotasModule {}
