import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class FiltrarAuditoriaDto {
  @ApiPropertyOptional({ description: 'Página (inicia en 1)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pagina?: number = 1;

  @ApiPropertyOptional({ description: 'Registros por página', default: 20 })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limite?: number = 20;

  @ApiPropertyOptional({ description: 'Filtrar por ID de usuario' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  id_usuario?: number;

  @ApiPropertyOptional({
    description: 'Filtrar por módulo (ej: USUARIOS, ROLES)',
  })
  @IsString()
  @IsOptional()
  modulo?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por acción (ej: CREAR, EDITAR, ELIMINAR)',
  })
  @IsString()
  @IsOptional()
  accion?: string;

  @ApiPropertyOptional({
    description: 'Filtrar por entidad (ej: Usuario, Cadete)',
  })
  @IsString()
  @IsOptional()
  entidad?: string;
}
