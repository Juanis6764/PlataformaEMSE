import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches } from 'class-validator';
import {
  MENSAJE_CI,
  SOLO_NUMEROS,
} from '../../../../comun/validaciones/persona.validaciones';

export class VerificarOtpDto {
  @ApiProperty({
    description: 'Cédula de Identidad única del usuario',
    example: '100001',
  })
  @IsString()
  @IsNotEmpty({ message: 'La Cédula de Identidad (CI) es obligatoria' })
  @Matches(SOLO_NUMEROS, { message: MENSAJE_CI })
  ci: string;

  @ApiProperty({
    description: 'Código de verificación OTP de 6 dígitos enviado por correo',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'El código OTP es obligatorio' })
  @Length(6, 6, { message: 'El código OTP debe ser exactamente de 6 dígitos' })
  @Matches(/^\d{6}$/, {
    message: 'El código OTP debe consistir en exactamente 6 dígitos numéricos',
  })
  codigo: string;
}
