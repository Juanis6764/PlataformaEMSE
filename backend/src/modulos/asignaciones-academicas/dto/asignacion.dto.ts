import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TipoAsignacionAcademica } from '@prisma/client';
import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional } from 'class-validator';

export class CrearAsignacionDto {
  @ApiProperty() @IsInt() id_usuario: number;
  @ApiProperty({ description: 'Subsección institucional real' })
  @IsInt()
  id_seccion: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() id_curso?: number;
  @ApiProperty({ enum: TipoAsignacionAcademica })
  @IsEnum(TipoAsignacionAcademica)
  tipo: TipoAsignacionAcademica;
}
export class FiltrarAsignacionesDto {
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  id_usuario?: number;
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  id_seccion?: number;
  @ApiPropertyOptional()
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  id_curso?: number;
  @ApiPropertyOptional()
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  solo_activas?: boolean;
}
