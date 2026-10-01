import { TipoMovimientoDocumento } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EnviarDocumentoDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_seccion_destino: number;

  @IsOptional()
  @IsEnum(TipoMovimientoDocumento)
  tipo_movimiento?: TipoMovimientoDocumento;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
