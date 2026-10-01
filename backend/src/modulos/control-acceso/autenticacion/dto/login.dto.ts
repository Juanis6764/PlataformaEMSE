import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches } from 'class-validator';
import {
  MENSAJE_CI,
  SOLO_NUMEROS,
} from '../../../../comun/validaciones/persona.validaciones';

export class LoginDto {
  @ApiProperty({
    description: 'Cédula de Identidad única del usuario',
    example: '100001',
  })
  @IsString()
  @IsNotEmpty({ message: 'La Cédula de Identidad (CI) es obligatoria' })
  @Matches(SOLO_NUMEROS, { message: MENSAJE_CI })
  ci: string;

  @ApiProperty({
    description: 'Contraseña del usuario',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria' })
  contrasena: string;
}
