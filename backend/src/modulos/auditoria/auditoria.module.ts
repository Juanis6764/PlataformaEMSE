import { Module } from '@nestjs/common';
import { AuditoriaService } from './auditoria.service';
import { AuditoriaController } from './auditoria.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AutenticacionModule } from '../control-acceso/autenticacion/autenticacion.module';

@Module({
  imports: [PrismaModule, AutenticacionModule],
  controllers: [AuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
