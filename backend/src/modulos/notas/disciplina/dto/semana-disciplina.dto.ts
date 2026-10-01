import { EstadoSemanaDisciplina, NivelRevisionNota } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearSemanaDisciplinaDto {
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
  numero_semana: number;
}

export class FiltrarSemanasDisciplinaDto {
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
  @IsEnum(EstadoSemanaDisciplina)
  estado?: EstadoSemanaDisciplina;

  @IsOptional()
  @IsEnum(NivelRevisionNota)
  nivel_revision?: NivelRevisionNota;
}

export class ObservarSemanaDisciplinaDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comentario: string;
}
