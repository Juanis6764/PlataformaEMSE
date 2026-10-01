import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CrearPermisoDto {
  @ApiProperty({
    description: 'Nombre único del permiso',
    example: 'CREAR_USUARIO',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del permiso es obligatorio' })
  nombre: string;

  @ApiProperty({
    description: 'Módulo del sistema al que pertenece',
    example: 'USUARIOS',
  })
  @IsString()
  @IsNotEmpty({ message: 'El módulo es obligatorio' })
  modulo: string;

  @ApiProperty({
    description: 'Acción que permite realizar',
    example: 'CREAR',
  })
  @IsString()
  @IsNotEmpty({ message: 'La acción es obligatoria' })
  accion: string;

  @ApiPropertyOptional({
    description: 'Descripción breve de la utilidad del permiso',
    example: 'Permite registrar nuevos usuarios administradores o cadetes',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class ActualizarPermisoDto {
  @ApiPropertyOptional({
    description: 'Nombre del permiso',
    example: 'EDITAR_USUARIO',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Módulo del sistema',
    example: 'USUARIOS',
  })
  @IsString()
  @IsOptional()
  modulo?: string;

  @ApiPropertyOptional({
    description: 'Acción permitida',
    example: 'EDITAR',
  })
  @IsString()
  @IsOptional()
  accion?: string;

  @ApiPropertyOptional({
    description: 'Descripción del permiso',
    example: 'Permite actualizar datos de usuarios',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}
