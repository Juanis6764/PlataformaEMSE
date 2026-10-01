import { TipoAtencionRequerida } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

const aEntero = ({ value }: { value: unknown }) => Number(value);
const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegistrarProveidoDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  contenido: string;

  @IsOptional()
  @IsDateString()
  fecha_hora_limite?: string;

  /** Solo aplica (y es obligatorio) para el segundo proveído (Segundo Comando -> área). */
  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_seccion_destino?: number;

  /** Solo aplica (y es obligatorio) para el segundo proveído. */
  @IsOptional()
  @IsEnum(TipoAtencionRequerida)
  tipo_atencion_requerida?: TipoAtencionRequerida;
}
