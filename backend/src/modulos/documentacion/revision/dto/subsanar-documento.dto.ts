import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class SubsanarDocumentoDto {
  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(1000)
  comentario?: string;
}
