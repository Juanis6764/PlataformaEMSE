import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

export class CrearCursoDto {
  @ApiProperty({
    description: 'Nombre único del curso',
    example: 'Cuarto Año',
  })
  @IsString()
  @IsNotEmpty({ message: 'El nombre del curso es obligatorio' })
  nombre: string;

  @ApiProperty({
    description: 'Orden de visualización secuencial de los cursos',
    example: 4,
  })
  @IsInt()
  @Min(1)
  @IsNotEmpty({ message: 'El orden es obligatorio' })
  orden: number;
}

export class ActualizarCursoDto {
  @ApiPropertyOptional({ description: 'Nombre del curso' })
  @IsString()
  @IsOptional()
  nombre?: string;

  @ApiPropertyOptional({ description: 'Orden de visualización' })
  @IsInt()
  @Min(1)
  @IsOptional()
  orden?: number;
}
