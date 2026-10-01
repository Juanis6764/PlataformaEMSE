import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const aBooleano = ({ value }: { value: unknown }) =>
  value === true || value === 'true'
    ? true
    : value === false || value === 'false'
      ? false
      : value;

export class CrearConfiguracionEvaluacionesDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_periodo: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_curso: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1)
  @Max(100)
  cantidad_materias: number;
}

export class ActualizarConfiguracionEvaluacionesDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  @Max(100)
  cantidad_materias: number;
}

export class FiltrarConfiguracionesEvaluacionesDto {
  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_gestion?: number;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_periodo?: number;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_curso?: number;

  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  solo_activas?: boolean;
}
