import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class RefreshDto {
  @ApiProperty({
    description: 'Refresh token emitido en el login',
    example: 'refresh_token_jwt_aqui',
  })
  @IsString()
  @IsNotEmpty({ message: 'El refresh token es obligatorio' })
  refresh_token: string;
}
