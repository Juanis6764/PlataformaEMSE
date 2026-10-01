import {
  EstadoDocumento,
  PrioridadDocumento,
  TipoDocumento,
} from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Max,
  Min,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);

export class FiltrarReporteDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  busqueda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero_hoja_ruta?: string;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(2000)
  @Max(2100)
  gestion?: number;

  @IsOptional() @IsDateString() fecha_desde?: string;
  @IsOptional() @IsDateString() fecha_hasta?: string;
  @IsOptional() @IsEnum(TipoDocumento) tipo_documento?: TipoDocumento;
  @IsOptional() @IsEnum(PrioridadDocumento) prioridad?: PrioridadDocumento;
  @IsOptional() @IsEnum(EstadoDocumento) estado?: EstadoDocumento;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_seccion?: number;
}
