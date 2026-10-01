import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
// Acepta coma o punto como separador decimal: en teclados en español es
// habitual escribir la coma, y el frontend ya normaliza, pero el backend
// se mantiene defensivo ante cualquier otro consumidor de la API.
const decimalNullable = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === ''
    ? value === ''
      ? null
      : value
    : typeof value === 'string'
      ? value.trim().replace(',', '.')
      : typeof value === 'number'
        ? value.toString()
        : value;
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const PATRON_NOTA = /^(?:100(?:\.0{1,4})?|\d{1,2}(?:\.\d{1,4})?)$/;

export class GuardarNotaEvaluacionDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_cadete: number;

  @Transform(decimalNullable)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_inicial debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_inicial: string;

  @IsOptional()
  @Transform(decimalNullable)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_desquite debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_desquite?: string | null;
}

export class GuardarNotasMateriaDto {
  @IsArray()
  @ArrayMaxSize(500)
  @ValidateNested({ each: true })
  @Type(() => GuardarNotaEvaluacionDto)
  notas: GuardarNotaEvaluacionDto[];
}

export class ModificarNotaExtraordinariaDto {
  @IsOptional()
  @Transform(decimalNullable)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_inicial debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_inicial?: string;

  @IsOptional()
  @Transform(decimalNullable)
  @IsString()
  @Matches(PATRON_NOTA, {
    message: 'nota_desquite debe estar entre 0 y 100 con hasta 4 decimales',
  })
  nota_desquite?: string | null;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  justificacion: string;
}
