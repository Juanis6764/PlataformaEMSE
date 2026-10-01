import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';
import { EstadoCadete, EstadoUsuario } from '@prisma/client';
import { Transform } from 'class-transformer';

const SOLO_LETRAS_Y_ESPACIOS = /^[\p{L} ]+$/u;
const SOLO_NUMEROS = /^\d+$/;

export class CrearCadeteDto {
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(SOLO_LETRAS_Y_ESPACIOS, {
    message: 'Los nombres solo pueden contener letras y espacios',
  })
  nombres: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(SOLO_LETRAS_Y_ESPACIOS, {
    message: 'Los apellidos solo pueden contener letras y espacios',
  })
  apellidos: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @Matches(SOLO_NUMEROS, { message: 'El CI solo puede contener números' })
  ci: string;
  @ApiProperty()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  correo: string;
  @ApiPropertyOptional() @IsString() @IsOptional() contrasena?: string;
  @ApiProperty({ enum: EstadoUsuario })
  @IsEnum(EstadoUsuario)
  estado: EstadoUsuario;
  @ApiProperty({ enum: EstadoCadete })
  @IsEnum(EstadoCadete)
  estado_cadete: EstadoCadete;
  @ApiProperty() @IsInt() id_curso: number;
  @ApiProperty() @IsInt() gestion_ingreso: number;
  @ApiPropertyOptional({ nullable: true }) @IsString() @IsOptional() arma?:
    | string
    | null;
}

export class EgresarCadeteDto {
  @ApiProperty({ description: 'Año de egreso' })
  @IsInt()
  gestion_egreso: number;
}

export class ActualizarCadeteDto {
  @ApiPropertyOptional({ description: 'Arma o especialidad del cadete' })
  @IsString()
  @IsOptional()
  arma?: string;

  @ApiPropertyOptional({
    description: 'Nuevo estado del cadete',
    enum: EstadoCadete,
  })
  @IsEnum(EstadoCadete)
  @IsOptional()
  estado_cadete?: EstadoCadete;

  @ApiPropertyOptional({ description: 'Año de egreso' })
  @IsInt()
  @IsOptional()
  gestion_egreso?: number;
}

export class PromoverCadetesDto {
  @ApiProperty({ description: 'Periodo lectivo real de la promoción' })
  @IsInt()
  id_periodo: number;
  @ApiPropertyOptional({ type: [Number] })
  @IsInt({ each: true })
  @IsOptional()
  ids_cadete?: number[];
}

export class CambiarCursoDto {
  @ApiProperty({ description: 'ID del nuevo curso asignado' })
  @IsInt()
  @IsNotEmpty({ message: 'El ID del curso es obligatorio' })
  id_curso: number;

  @ApiProperty({ description: 'Periodo lectivo real del cambio de curso' })
  @IsInt()
  @IsNotEmpty({ message: 'El periodo lectivo es obligatorio' })
  id_periodo: number;

  @ApiPropertyOptional({
    description: 'Estado del cadete para el registro del historial',
    enum: EstadoCadete,
  })
  @IsEnum(EstadoCadete)
  @IsOptional()
  estado_cadete?: EstadoCadete;
}
