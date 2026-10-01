import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;
const aBooleano = ({ value }: { value: unknown }) => {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  return value;
};

export class CrearOficialDisciplinaDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  codigo: string;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre_completo: string;
}

export class ActualizarOficialDisciplinaDto extends PartialType(
  CrearOficialDisciplinaDto,
) {}

export class FiltrarOficialesDisciplinaDto {
  @IsOptional()
  @Transform(aBooleano)
  @IsBoolean()
  solo_activos?: boolean;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(100)
  buscar?: string;
}
