import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CrearUsuarioDto } from '../../modulos/control-acceso/usuarios/dto/crear-usuario.dto';

const validar = (cambios: Partial<CrearUsuarioDto> = {}) =>
  validate(
    plainToInstance(CrearUsuarioDto, {
      nombres: 'María José',
      apellidos: 'Núñez Álvarez',
      ci: '123456',
      correo: 'persona@emse.edu.bo',
      id_rol: 1,
      ...cambios,
    }),
  );

describe('validaciones de datos personales', () => {
  it('acepta tildes, espacios, CI numérico y correo repetible por formato', async () => {
    await expect(validar()).resolves.toHaveLength(0);
  });

  it.each(['12A', '12 3', '12-3', '+123'])(
    'rechaza CI inválido: %s',
    async (ci) => {
      expect((await validar({ ci })).some((e) => e.property === 'ci')).toBe(
        true,
      );
    },
  );

  it.each(['Ana2', 'Ana-María', 'Ana!'])(
    'rechaza nombre inválido: %s',
    async (nombres) => {
      expect(
        (await validar({ nombres })).some((e) => e.property === 'nombres'),
      ).toBe(true);
    },
  );

  it('rechaza correo con formato inválido', async () => {
    expect(
      (await validar({ correo: 'correo-invalido' })).some(
        (e) => e.property === 'correo',
      ),
    ).toBe(true);
  });
});
