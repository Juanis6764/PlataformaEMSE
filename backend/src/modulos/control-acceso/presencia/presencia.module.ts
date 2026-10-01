import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';
import { PresenciaGateway } from './presencia.gateway';
import { PresenciaService } from './presencia.service';

@Module({
  imports: [PrismaModule, AutenticacionModule],
  providers: [PresenciaService, PresenciaGateway],
  exports: [PresenciaService],
})
export class PresenciaModule {}
