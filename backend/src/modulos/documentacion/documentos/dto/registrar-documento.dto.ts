import {
  ClasificacionDocumento,
  PrioridadDocumento,
  TipoDocumento,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegistrarDocumentoDto {
  @IsEnum(TipoDocumento)
  tipo_documento: TipoDocumento;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(60)
  numero_origen?: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(200)
  procedencia?: string;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  asunto: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  sintesis?: string;

  @IsOptional()
  @IsEnum(PrioridadDocumento)
  prioridad?: PrioridadDocumento;

  @IsOptional()
  @IsEnum(ClasificacionDocumento)
  clasificacion?: ClasificacionDocumento;

  @IsOptional()
  @IsDateString()
  fecha_documento?: string;
}
