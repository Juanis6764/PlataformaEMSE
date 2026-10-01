import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

const SOLO_LETRAS_Y_ESPACIOS = /^[\p{L} ]+$/u;
const SOLO_NUMEROS = /^\d+$/;

export class CrearUsuarioDto {
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
  @ApiPropertyOptional()
  @Transform(({ value }) =>
    typeof value === 'string' && value.trim() === ''
      ? undefined
      : typeof value === 'string'
        ? value.trim()
        : value,
  )
  @IsEmail({}, { message: 'El correo electrónico no tiene un formato válido' })
  @IsOptional()
  correo?: string;
  @ApiPropertyOptional()
  @IsString()
  @MinLength(6)
  @IsOptional()
  contrasena?: string;
  @ApiProperty() @IsInt() id_rol: number;
  @ApiPropertyOptional() @IsInt() @IsOptional() id_seccion?: number;
  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  es_mixto?: boolean;
}
