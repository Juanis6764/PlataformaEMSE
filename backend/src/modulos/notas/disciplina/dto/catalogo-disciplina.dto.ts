import { PartialType } from '@nestjs/swagger';
import { TipoDisciplina } from '@prisma/client';
import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
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

export class CrearCatalogoDisciplinaDto {
  @IsEnum(TipoDisciplina)
  tipo: TipoDisciplina;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  codigo: string;

  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  nombre: string;

  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @Matches(/^\d+(?:\.\d{1,4})?$/, {
    message: 'puntaje_base debe ser un decimal positivo con hasta 4 decimales',
  })
  puntaje_base?: string;
}

export class ActualizarCatalogoDisciplinaDto extends PartialType(
  CrearCatalogoDisciplinaDto,
) {}

export class FiltrarCatalogoDisciplinaDto {
  @IsOptional()
  @IsEnum(TipoDisciplina)
  tipo?: TipoDisciplina;

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
