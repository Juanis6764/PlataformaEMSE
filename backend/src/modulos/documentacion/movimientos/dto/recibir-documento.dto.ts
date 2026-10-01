import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';

const limpiar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class RecibirDocumentoDto {
  @IsOptional()
  @Transform(limpiar)
  @IsString()
  @MaxLength(500)
  observacion?: string;
}
