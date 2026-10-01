import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CrearRolDto {
  @ApiProperty({
    description: 'Nombre único del rol',
    example: 'OPERADOR_DISCIPLINA',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del rol es obligatorio' })
  nombre: string;

  @ApiPropertyOptional({
    description: 'Descripción breve del rol',
    example: 'Permite registrar notas y reportes en el área de disciplina',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class ActualizarRolDto {
  @ApiPropertyOptional({
    description: 'Nombre del rol',
    example: 'OPERADOR_DISCIPLINA_MODIFICADO',
  })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({
    description: 'Descripción del rol',
    example: 'Descripción modificada del rol',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;
}

export class AsignarPermisosDto {
  @ApiProperty({
    description: 'Arreglo de IDs de permisos a asociar al rol',
    example: [1, 2, 3],
    type: [Number],
  })
  @IsNotEmpty({ message: 'El arreglo de permisos es obligatorio' })
  permisosIds: number[];
}
