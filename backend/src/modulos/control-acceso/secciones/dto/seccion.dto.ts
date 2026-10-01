import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { TipoSeccion } from '@prisma/client';

export class CrearSeccionDto {
  @ApiProperty({
    description: 'Nombre único de la sección',
    example: 'PRIMERA COMPAÑÍA',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre de la sección es obligatorio' })
  nombre: string;

  @ApiProperty({
    description:
      'Nivel jerárquico de la sección (1: Batallón, 2: Compañía, 3: Sección, etc.)',
    example: 2,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'El nivel es obligatorio' })
  nivel: number;

  @ApiPropertyOptional({
    description: 'Descripción breve de la sección',
    example: 'Subdivisión del Batallón de Cadetes',
  })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiProperty({
    description: 'Tipo organizativo de la sección',
    enum: TipoSeccion,
    example: TipoSeccion.ADMINISTRATIVA,
  })
  @IsEnum(TipoSeccion, { message: 'El tipo de sección no es válido' })
  @IsNotEmpty({ message: 'El tipo de sección es obligatorio' })
  tipo: TipoSeccion;

  @ApiPropertyOptional({
    description: 'ID de la sección padre superior',
    example: 1,
  })
  @IsInt()
  @IsOptional()
  id_seccion_padre?: number;
}

export class ActualizarSeccionDto {
  @ApiPropertyOptional({ description: 'Nombre de la sección' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Nivel jerárquico' })
  @IsInt()
  @Min(1)
  @IsOptional()
  nivel?: number;

  @ApiPropertyOptional({ description: 'Descripción de la sección' })
  @IsString()
  @IsOptional()
  descripcion?: string;

  @ApiPropertyOptional({ description: 'Tipo organizativo', enum: TipoSeccion })
  @IsEnum(TipoSeccion)
  @IsOptional()
  tipo?: TipoSeccion;

  @ApiPropertyOptional({ description: 'ID de la sección padre superior' })
  @IsInt()
  @IsOptional()
  id_seccion_padre?: number;
}
