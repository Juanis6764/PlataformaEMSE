import { Module } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { AutenticacionModule } from '../autenticacion/autenticacion.module';
import { PresenciaModule } from '../presencia/presencia.module';

@Module({
  imports: [PrismaModule, AutenticacionModule, PresenciaModule],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
