import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import { TipoMatrizAcademica } from '@prisma/client';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimal = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(',', '.') : String(value);

export class SeleccionarMatrizAcademicaDto {
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

  @IsOptional()
  @IsEnum(TipoMatrizAcademica)
  tipo?: TipoMatrizAcademica = TipoMatrizAcademica.SEMESTRAL;
}

export class ObservarMatrizAcademicaDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  observacion: string;
}

export class RegistrarAntecedenteAcademicoDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_cadete: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1900)
  @Max(2025)
  gestion: number;

  @Transform(decimal)
  @IsString()
  @Matches(/^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/)
  promedio_general: string;

  @Transform(aEntero)
  @IsInt()
  @Min(0)
  cantidad_aplazos: number;
}

export class BuscarHistorialAcademicoDto {
  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(120)
  q?: string;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_curso?: number;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1900)
  gestion?: number;
}

export class BuscarCorreccionExtraordinariaDto {
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

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(120)
  q?: string;
}
