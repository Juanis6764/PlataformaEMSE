import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { EstadoSemanaDisciplina } from '@prisma/client';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const decimal = ({ value }: { value: unknown }) =>
  typeof value === 'string'
    ? value.trim().replace(',', '.')
    : typeof value === 'number'
      ? value.toString()
      : value;
const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export class SeleccionarPlanillaEntrenamientoDto {
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

export class FiltrarPlanillasEntrenamientoDto {
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
  @IsEnum(EstadoSemanaDisciplina)
  estado?: EstadoSemanaDisciplina;
}

export class GuardarNotaEntrenamientoDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_cadete: number;

  @Transform(decimal)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_final debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_final: string;
}

export class GuardarNotasEntrenamientoDto extends SeleccionarPlanillaEntrenamientoDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => GuardarNotaEntrenamientoDto)
  notas: GuardarNotaEntrenamientoDto[];
}

export class ObservarPlanillaEntrenamientoDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comentario: string;
}

export class ModificarNotaEntrenamientoExtraordinariaDto {
  @Transform(decimal)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_final debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_final: string;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  justificacion: string;
}

export class ConsultarResultadosEntrenamientoEvaluacionesDto {
  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_planilla?: number;
}
