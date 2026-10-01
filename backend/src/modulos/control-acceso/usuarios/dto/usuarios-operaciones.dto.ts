import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EstadoUsuario } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

const SOLO_LETRAS_Y_ESPACIOS = /^[\p{L} ]+$/u;
const SOLO_NUMEROS = /^\d+$/;

export class ActualizarUsuarioDto {
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(SOLO_NUMEROS, { message: 'El CI solo puede contener números' })
  @IsOptional()
  ci?: string;
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(SOLO_LETRAS_Y_ESPACIOS, {
    message: 'Los nombres solo pueden contener letras y espacios',
  })
  @IsOptional()
  nombres?: string;
  @ApiPropertyOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @Matches(SOLO_LETRAS_Y_ESPACIOS, {
    message: 'Los apellidos solo pueden contener letras y espacios',
  })
  @IsOptional()
  apellidos?: string;
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? null
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsOptional()
  correo?: string | null;
  @ApiPropertyOptional() @IsInt() @IsOptional() id_rol?: number;
  @ApiPropertyOptional({ nullable: true }) @IsInt() @IsOptional() id_seccion?:
    | number
    | null;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() habilitado?: boolean;
  @ApiPropertyOptional() @IsBoolean() @IsOptional() es_mixto?: boolean;
  @ApiPropertyOptional({
    description: 'Curso, solamente si el usuario es cadete',
  })
  @IsInt()
  @IsOptional()
  id_curso?: number;
}
export class FiltrarUsuariosDto {
  @Type(() => Number) @IsInt() @Min(1) @IsOptional() pagina = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) @IsOptional() limite = 10;
  @IsString() @IsOptional() buscar?: string;
  @Type(() => Number) @IsInt() @IsOptional() id_rol?: number;
  @Type(() => Number) @IsInt() @IsOptional() id_seccion?: number;
  @IsEnum(EstadoUsuario) @IsOptional() estado?: EstadoUsuario;
  @Type(() => Boolean) @IsBoolean() @IsOptional() habilitado?: boolean;
  @Transform(({ value }) => value === true || value === 'true')
  @IsBoolean()
  @IsOptional()
  incluir_cadetes = false;
}
export class CambiarEstadoDto {
  @ApiProperty() @IsBoolean() @IsNotEmpty() habilitado: boolean;
}
export class CambiarRolDto {
  @ApiProperty() @IsInt() id_rol: number;
}
export class CambiarSeccionDto {
  @ApiProperty() @IsInt() id_seccion: number;
}
export class OverridePermisoDto {
  @IsInt() id_permiso: number;
  @IsBoolean() concedido: boolean;
}
export class ActualizarPermisosUsuarioDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OverridePermisoDto)
  permisos: OverridePermisoDto[];
}
