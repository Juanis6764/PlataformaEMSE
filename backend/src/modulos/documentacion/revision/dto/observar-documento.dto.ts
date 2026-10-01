import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class ObservarDocumentoDto {
  @Transform(limpiar)
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  comentario: string;
}
