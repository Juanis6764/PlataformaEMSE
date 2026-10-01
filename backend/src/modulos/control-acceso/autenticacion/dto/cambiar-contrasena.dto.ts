import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @ApiProperty({
    description: 'Contraseña actual del usuario',
    example: '123456',
  })
  @IsString()
  @IsNotEmpty({ message: 'La contraseña actual es obligatoria' })
  contrasenaActual: string;

  @ApiProperty({
    description: 'Nueva contraseña a establecer',
    example: 'nueva_contrasena_segura_2026',
  })
  @IsString()
  @IsNotEmpty({ message: 'La nueva contraseña es obligatoria' })
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  contrasenaNueva: string;
}
