import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AutenticacionService } from './autenticacion.service';
import { AutenticacionController } from './autenticacion.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CorreoModule } from '../../correo/correo.module';

@Module({
  imports: [
    PrismaModule,
    CorreoModule,
    JwtModule.register({
      secret:
        process.env.JWT_SECRET ||
        'emse_backend_seguridad_2026_secreto_clave_secreta',
      signOptions: {
        expiresIn: '8h',
      },
    }),
  ],
  controllers: [AutenticacionController],
  providers: [AutenticacionService],
  exports: [AutenticacionService, JwtModule],
})
export class AutenticacionModule {}
