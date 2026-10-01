import { Transform } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RegistrarCumplimientoDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  descripcion: string;
}
