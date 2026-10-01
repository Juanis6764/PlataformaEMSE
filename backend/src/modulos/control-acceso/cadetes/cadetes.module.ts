import { Module } from '@nestjs/common';
import { CadetesService } from './cadetes.service';
import { CadetesController } from './cadetes.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';
import { PresenciaModule } from '../presencia/presencia.module';

@Module({
  imports: [PrismaModule, AutenticacionModule, PresenciaModule],
  controllers: [CadetesController],
  providers: [CadetesService],
  exports: [CadetesService],
})
export class CadetesModule {}
