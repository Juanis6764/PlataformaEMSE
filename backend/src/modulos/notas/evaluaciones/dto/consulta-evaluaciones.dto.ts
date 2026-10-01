import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);

export class ConsultarEvaluacionesDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_gestion: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_periodo: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_curso: number;
}

export class ConsultarMisEvaluacionesDto {
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
}
