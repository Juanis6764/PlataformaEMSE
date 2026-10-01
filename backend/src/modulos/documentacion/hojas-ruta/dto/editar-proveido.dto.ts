import { Transform } from 'class-transformer';
import { IsDateString, IsOptional, IsString, MinLength } from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class EditarProveidoDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  contenido: string;

  @IsOptional()
  @IsDateString()
  fecha_hora_limite?: string;
}
