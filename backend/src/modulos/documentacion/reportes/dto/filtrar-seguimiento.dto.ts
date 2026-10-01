import { EstadoDocumento, TipoDocumento } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export const PESTANAS_SEGUIMIENTO = [
  'EN_SEGUIMIENTO',
  'CONCLUIDOS',
  'TODOS',
] as const;

export const SITUACIONES_PLAZO = [
  'SIN_PLAZO',
  'EN_PLAZO',
  'PROXIMO_A_VENCER',
  'VENCE_HOY',
  'VENCIDO',
  'CUMPLIDO',
  'CUMPLIDO_TARDE',
] as const;

export const ESTADOS_SEGUIMIENTO_SIMPLIFICADOS = [
  'EN_SEGUIMIENTO',
  'OBSERVADO',
  'FINALIZADO',
  'ARCHIVADO',
] as const;

export const MODOS_REPORTE_AREA = ['ACTUAL', 'HISTORICO'] as const;
export type ModoReporteArea = (typeof MODOS_REPORTE_AREA)[number];

export type PestanaSeguimiento = (typeof PESTANAS_SEGUIMIENTO)[number];
export type SituacionPlazoSeguimiento = (typeof SITUACIONES_PLAZO)[number];
export type EstadoSeguimientoSimplificado =
  (typeof ESTADOS_SEGUIMIENTO_SIMPLIFICADOS)[number];

const aEntero = ({ value }: { value: unknown }) => Number(value);

export class FiltrarSeguimientoDto {
  @IsOptional()
  @IsIn(MODOS_REPORTE_AREA)
  modo?: ModoReporteArea;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  busqueda?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  codigo_interno?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  asunto?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  numero_hoja_ruta?: string;

  @IsOptional()
  @IsDateString()
  fecha_desde?: string;

  @IsOptional()
  @IsDateString()
  fecha_hasta?: string;

  @IsOptional()
  @IsEnum(TipoDocumento)
  tipo_documento?: TipoDocumento;

  @IsOptional()
  @IsEnum(EstadoDocumento)
  estado?: EstadoDocumento;

  @IsOptional()
  @IsIn(ESTADOS_SEGUIMIENTO_SIMPLIFICADOS)
  estado_simple?: EstadoSeguimientoSimplificado;

  @IsOptional()
  @Transform(aEntero)
  @IsInt()
  @Min(1)
  id_seccion?: number;

  @IsOptional()
  @IsIn(SITUACIONES_PLAZO)
  situacion_plazo?: SituacionPlazoSeguimiento;

  @IsOptional()
  @IsIn(PESTANAS_SEGUIMIENTO)
  pestana?: PestanaSeguimiento;
}
