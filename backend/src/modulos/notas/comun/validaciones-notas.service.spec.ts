/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access */
import { ForbiddenException } from '@nestjs/common';
import { ValidacionesNotasService } from './validaciones-notas.service';

describe('ValidacionesNotasService', () => {
  const prisma = {
    curso: { findUnique: jest.fn() },
    usuario: { findUnique: jest.fn() },
    asignacionAcademica: { findFirst: jest.fn() },
  } as any;
  const servicio = new ValidacionesNotasService(prisma);

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.curso.findUnique.mockResolvedValue({
      id_curso: 2,
      nombre: 'Segundo Año',
      orden: 2,
    });
  });

  it('deniega a un operador un curso distinto de su asignación activa', async () => {
    jest.spyOn(servicio, 'obtenerPerfil').mockResolvedValue({
      id_usuario: 10,
      tipo: 'OPERADOR_DISCIPLINA',
      cursos_asignados: [1],
      permisos: new Set(),
    });

    await expect(
      servicio.validarAccesoCurso(10, 2, 'LECTURA'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('permite al Encargado acceder a cualquiera de los tres cursos', async () => {
    jest.spyOn(servicio, 'obtenerPerfil').mockResolvedValue({
      id_usuario: 20,
      tipo: 'ENCARGADO_DISCIPLINA',
      cursos_asignados: [],
      permisos: new Set(),
    });

    await expect(
      servicio.validarAccesoCurso(20, 2, 'REGISTRO'),
    ).resolves.toMatchObject({ tipo: 'ENCARGADO_DISCIPLINA' });
  });

  it('permite a COMANDO consultar los tres cursos y le niega registro', async () => {
    jest.spyOn(servicio, 'obtenerPerfil').mockResolvedValue({
      id_usuario: 30,
      tipo: 'COMANDO',
      cursos_asignados: [],
      permisos: new Set(['VER_NOTAS']),
    });

    await expect(
      servicio.validarAccesoCurso(30, 2, 'LECTURA'),
    ).resolves.toMatchObject({ tipo: 'COMANDO' });
    await expect(
      servicio.validarAccesoCurso(30, 2, 'REGISTRO'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('reconoce como SECCION_ACADEMICA al responsable notificado de Jefatura en Entrenamiento Físico', async () => {
    prisma.usuario.findUnique.mockResolvedValue({
      id_usuario: 10,
      habilitado: true,
      rol: {
        nombre: 'ADMINISTRATIVO_ACADEMICO',
        permisos: [
          { permiso: { nombre: 'VER_NOTAS', estado: true } },
          { permiso: { nombre: 'REVISAR_NOTAS', estado: true } },
        ],
      },
      permisos_individuales: [],
      asignaciones_academicas: [
        {
          tipo: 'RESPONSABLE',
          id_curso: null,
          seccion: { nombre: 'JEFATURA_ESTUDIOS' },
        },
      ],
      seccion: { nombre: 'JEFATURA_ESTUDIOS' },
      cadete: null,
    });
    prisma.asignacionAcademica.findFirst.mockResolvedValue({ id_asignacion: 5 });

    await expect(
      servicio.obtenerPerfilEntrenamientoFisico(10),
    ).resolves.toMatchObject({ tipo: 'SECCION_ACADEMICA' });
  });
});
