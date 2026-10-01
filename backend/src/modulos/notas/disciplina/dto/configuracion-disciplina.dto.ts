import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const aBooleano = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class CrearConfiguracionDisciplinaDto {
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
  @Max(22)
  cantidad_semanas: number;
}

export class ActualizarConfiguracionDisciplinaDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  @Max(22)
  cantidad_semanas: number;
}

export class FiltrarConfiguracionesDisciplinaDto {
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
