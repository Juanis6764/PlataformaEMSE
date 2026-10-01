import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AutenticacionModule } from './modulos/control-acceso/autenticacion/autenticacion.module';
import { UsuariosModule } from './modulos/control-acceso/usuarios/usuarios.module';
import { RolesModule } from './modulos/control-acceso/roles/roles.module';
import { PermisosModule } from './modulos/control-acceso/permisos/permisos.module';
import { SeccionesModule } from './modulos/control-acceso/secciones/secciones.module';
import { CursosModule } from './modulos/control-acceso/cursos/cursos.module';
import { CadetesModule } from './modulos/control-acceso/cadetes/cadetes.module';
import { AsignacionesAcademicasModule } from './modulos/asignaciones-academicas/asignaciones-academicas.module';
import { AuditoriaModule } from './modulos/auditoria/auditoria.module';
import { GestionAcademicaModule } from './modulos/gestion-academica/gestion-academica.module';
import { NotificacionesModule } from './modulos/notificaciones/notificaciones.module';
import { NotasModule } from './modulos/notas/notas.module';
import { DocumentacionModule } from './modulos/documentacion/documentacion.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    AutenticacionModule,
    UsuariosModule,
    RolesModule,
    PermisosModule,
    SeccionesModule,
    CursosModule,
    CadetesModule,
    AsignacionesAcademicasModule,
    AuditoriaModule,
    GestionAcademicaModule,
    NotificacionesModule,
    NotasModule,
    DocumentacionModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
