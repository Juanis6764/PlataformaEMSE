import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { EstadoCadete } from '@prisma/client';

export class FiltrarCadetesDto {
  @ApiPropertyOptional({ description: 'Página (inicia en 1)', default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  @Type(() => Number)
  pagina?: number = 1;

  @ApiPropertyOptional({
    description: 'Cantidad de resultados por página',
    default: 20,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  @Type(() => Number)
  limite?: number = 20;

  @ApiPropertyOptional({
    description: 'Búsqueda libre por nombres, apellidos o CI',
  })
  @IsString()
  @IsOptional()
  buscar?: string;

  @ApiPropertyOptional({ description: 'ID del curso', example: 1 })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  id_curso?: number;

  @ApiPropertyOptional({ description: 'Estado del cadete', enum: EstadoCadete })
  @IsEnum(EstadoCadete)
  @IsOptional()
  estado_cadete?: EstadoCadete;

  @ApiPropertyOptional({ description: 'Filtrar por arma (especialidad)' })
  @IsString()
  @IsOptional()
  arma?: string;

  @ApiPropertyOptional({ description: 'Año de ingreso (gestión)' })
  @IsInt()
  @IsOptional()
  @Type(() => Number)
  gestion_ingreso?: number;
}
