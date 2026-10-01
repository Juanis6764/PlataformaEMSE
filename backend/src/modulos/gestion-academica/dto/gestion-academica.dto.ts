import { Transform } from 'class-transformer';
import { IsEnum, IsInt, Min } from 'class-validator';
import { EstadoGestion } from '@prisma/client';

const aEntero = ({ value }: { value: unknown }) => Number(value);

/** Crea una gestión académica (ej. 2026); sus dos periodos I/II se generan junto con ella. */
export class CrearGestionAcademicaDto {
  @Transform(aEntero)
  @IsInt()
  @Min(1900)
  ano: number;
}

export class ActualizarGestionAcademicaDto {
  @IsEnum(EstadoGestion)
  estado: EstadoGestion;
}
