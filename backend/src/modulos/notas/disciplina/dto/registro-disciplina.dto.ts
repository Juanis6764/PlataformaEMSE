import { PartialType } from '@nestjs/swagger';
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

const aEnteroNullable = ({ value }: { value: unknown }) =>
  value === null || value === undefined || value === '' ? value : Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearRegistroDisciplinaDto {
  @Transform(aEnteroNullable)
  @IsInt()
  @Min(1)
  id_cadete: number;

  @Transform(aEnteroNullable)
  @IsInt()
  @Min(1)
  id_catalogo: number;

  @IsOptional()
  @Transform(aEnteroNullable)
  @IsInt()
  @Min(1)
  id_oficial?: number | null;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre_responsable_manual?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  fecha_hecho?: string | null;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'puntaje debe ser un decimal positivo con hasta 4 decimales',
  })
  puntaje?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(2000)
  observacion?: string;
}

export class ActualizarRegistroDisciplinaDto extends PartialType(
  CrearRegistroDisciplinaDto,
) {}

export class ModificarRegistroExtraordinarioDto extends ActualizarRegistroDisciplinaDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  justificacion: string;
}
