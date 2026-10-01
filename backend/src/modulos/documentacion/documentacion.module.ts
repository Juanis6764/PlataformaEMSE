import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditoriaModule } from '../auditoria/auditoria.module';
import { AutenticacionModule } from '../control-acceso/autenticacion/autenticacion.module';
import { NotificacionesModule } from '../notificaciones/notificaciones.module';
import { CorrelativoDocumentalService } from './comun/correlativo-documental.service';
import { FlujoDocumentalService } from './comun/flujo-documental.service';
import { NotificacionesDocumentalesService } from './comun/notificaciones-documentales.service';
import { ValidacionesDocumentalesService } from './comun/validaciones-documentales.service';
import { AlmacenamientoLocalService } from './archivos/almacenamiento/almacenamiento-local.service';
import { SERVICIO_ALMACENAMIENTO } from './archivos/almacenamiento/almacenamiento.interface';
import { ArchivosController } from './archivos/archivos.controller';
import { ArchivosService } from './archivos/archivos.service';
import { CumplimientosController } from './cumplimientos/cumplimientos.controller';
import { CumplimientosService } from './cumplimientos/cumplimientos.service';
import { DocumentosController } from './documentos/documentos.controller';
import { DocumentosService } from './documentos/documentos.service';
import { HojasRutaController } from './hojas-ruta/hojas-ruta.controller';
import { HojasRutaService } from './hojas-ruta/hojas-ruta.service';
import { MovimientosController } from './movimientos/movimientos.controller';
import { MovimientosService } from './movimientos/movimientos.service';
import { PlazosSchedulerService } from './plazos/plazos-scheduler.service';
import { PlazosService } from './plazos/plazos.service';
import { ReportesController } from './reportes/reportes.controller';
import { ReportesService } from './reportes/reportes.service';
import { RevisionController } from './revision/revision.controller';
import { RevisionService } from './revision/revision.service';
import { SeccionesDocumentalesController } from './secciones/secciones-documentales.controller';
import { SeccionesDocumentalesService } from './secciones/secciones-documentales.service';
import { TrazabilidadController } from './trazabilidad/trazabilidad.controller';
import { TrazabilidadService } from './trazabilidad/trazabilidad.service';
import { DocumentacionGateway } from './tiempo-real/documentacion.gateway';

@Module({
  imports: [
    PrismaModule,
    AutenticacionModule,
    AuditoriaModule,
    NotificacionesModule,
  ],
  controllers: [
    DocumentosController,
    MovimientosController,
    HojasRutaController,
    CumplimientosController,
    RevisionController,
    ArchivosController,
    TrazabilidadController,
    ReportesController,
    SeccionesDocumentalesController,
  ],
  providers: [
    ValidacionesDocumentalesService,
    FlujoDocumentalService,
    NotificacionesDocumentalesService,
    CorrelativoDocumentalService,
    DocumentosService,
    MovimientosService,
    HojasRutaService,
    CumplimientosService,
    RevisionService,
    ArchivosService,
    { provide: SERVICIO_ALMACENAMIENTO, useClass: AlmacenamientoLocalService },
    PlazosService,
    PlazosSchedulerService,
    TrazabilidadService,
    ReportesService,
    DocumentacionGateway,
    SeccionesDocumentalesService,
  ],
  exports: [
    ValidacionesDocumentalesService,
    FlujoDocumentalService,
    NotificacionesDocumentalesService,
    CorrelativoDocumentalService,
    MovimientosService,
  ],
})
export class DocumentacionModule {}
