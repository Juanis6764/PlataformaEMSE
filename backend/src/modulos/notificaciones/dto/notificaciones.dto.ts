import { Transform, TransformFnParams, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModuloNotificacion } from '@prisma/client';

export class FiltrarNotificacionesDto {
  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  pagina = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limite = 20;

  @ApiPropertyOptional()
  @Transform((parametros: TransformFnParams) => {
    const valor: unknown = parametros.value;
    if (valor === undefined) return undefined;
    if (valor === 'true' || valor === true) return true;
    if (valor === 'false' || valor === false) return false;
    return valor;
  })
  @IsBoolean()
  @IsOptional()
  leida?: boolean;

  @ApiPropertyOptional({ enum: ModuloNotificacion })
  @IsEnum(ModuloNotificacion)
  @IsOptional()
  modulo?: ModuloNotificacion;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  area?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  tipo?: string;
}
