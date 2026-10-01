import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const decimal = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().replace(',', '.') : String(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export class ConsultarAcumuladoDisciplinaDto {
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
  @IsDateString({ strict: true })
  fecha_inicial?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_final?: string;
}

export class ConsultarCuadroDemostrativoDisciplinaDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_gestion: number;

  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_periodo: number;
}

export class ConsultarMisRegistrosDisciplinaDto {
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

export class SeleccionarResultadoFinalDisciplinaDto {
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

export class ModificarResultadoFinalDisciplinaDto {
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
