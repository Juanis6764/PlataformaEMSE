import { ForbiddenException } from '@nestjs/common';
import { EstadoSemanaDisciplina, Prisma, TipoDisciplina } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PrismaService } from '../../../prisma/prisma.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { ConsultasDisciplinaService } from './consultas-disciplina.service';
import { ConsultarCuadroDemostrativoDisciplinaDto } from './dto/consulta-disciplina.dto';

describe('ConsultasDisciplinaService - cuadro demostrativo', () => {
  const perfilOperador = {
    id_usuario: 21,
    tipo: 'OPERADOR_DISCIPLINA' as const,
    cursos_asignados: [2],
    permisos: new Set(['VER_NOTAS']),
  };
  const prisma = {
    periodoLectivo: { findUnique: jest.fn() },
    curso: { findUnique: jest.fn() },
    configuracionDisciplinaPeriodo: { findUnique: jest.fn() },
    cadete: { findMany: jest.fn() },
    registroDisciplina: { findMany: jest.fn() },
  };
  const validaciones = {
    obtenerPerfil: jest.fn(),
    exigirTipo: jest.fn(
      (perfil: typeof perfilOperador, tipo: typeof perfilOperador.tipo) => {
        if (perfil.tipo !== tipo) throw new ForbiddenException();
      },
    ),
    validarAccesoCurso: jest.fn(),
  };
  const servicio = new ConsultasDisciplinaService(
    prisma as unknown as PrismaService,
    validaciones as unknown as ValidacionesNotasService,
  );
  const filtros = { id_gestion: 7, id_periodo: 11 };

  beforeEach(() => {
    jest.clearAllMocks();
    validaciones.obtenerPerfil.mockResolvedValue(perfilOperador);
    validaciones.exigirTipo.mockImplementation(
      (perfil: typeof perfilOperador, tipo: typeof perfilOperador.tipo) => {
        if (perfil.tipo !== tipo) throw new ForbiddenException();
      },
    );
    validaciones.validarAccesoCurso.mockResolvedValue(perfilOperador);
    prisma.periodoLectivo.findUnique.mockResolvedValue({
      id_periodo: 11,
      id_gestion: 7,
      periodo: 'I',
      gestion: { ano: 2026 },
    });
    prisma.curso.findUnique.mockResolvedValue({
      id_curso: 2,
      nombre: 'SEGUNDO_ANO',
    });
    prisma.configuracionDisciplinaPeriodo.findUnique.mockResolvedValue({
      cantidad_semanas: 3,
    });
    prisma.cadete.findMany.mockResolvedValue([
      {
        id_cadete: 101,
        arma: 'INFANTERÍA',
        usuario: { ci: '101', nombres: 'Ana', apellidos: 'Álvarez' },
      },
      {
        id_cadete: 102,
        arma: null,
        usuario: { ci: '102', nombres: 'Bruno', apellidos: 'Zárate' },
      },
    ]);
    prisma.registroDisciplina.findMany.mockResolvedValue([]);
  });

  it('incluye BORRADOR, suma deméritos por semana y totaliza méritos del semestre', async () => {
    prisma.registroDisciplina.findMany.mockResolvedValue([
      {
        id_registro: 1,
        id_cadete: 101,
        puntaje: new Prisma.Decimal('2'),
        catalogo: {
          tipo: TipoDisciplina.DEMERITO,
          codigo: 'D-01',
          nombre: 'Demérito en borrador',
        },
        semana: {
          numero_semana: 1,
          estado: EstadoSemanaDisciplina.BORRADOR,
        },
      },
      {
        id_registro: 2,
        id_cadete: 101,
        puntaje: new Prisma.Decimal('3.5'),
        catalogo: {
          tipo: TipoDisciplina.DEMERITO,
          codigo: 'D-02',
          nombre: 'Demérito publicado',
        },
        semana: {
          numero_semana: 2,
          estado: EstadoSemanaDisciplina.PUBLICADO,
        },
      },
      {
        id_registro: 3,
        id_cadete: 101,
        puntaje: new Prisma.Decimal('4'),
        catalogo: {
          tipo: TipoDisciplina.MERITO,
          codigo: 'M-01',
          nombre: 'Mérito en borrador',
        },
        semana: {
          numero_semana: 1,
          estado: EstadoSemanaDisciplina.BORRADOR,
        },
      },
      {
        id_registro: 4,
        id_cadete: 101,
        puntaje: new Prisma.Decimal('1'),
        catalogo: {
          tipo: TipoDisciplina.MERITO,
          codigo: 'M-02',
          nombre: 'Segundo mérito',
        },
        semana: {
          numero_semana: 3,
          estado: EstadoSemanaDisciplina.OBSERVADO,
        },
      },
    ]);

    const resultado = await servicio.cuadroDemostrativo(21, filtros);

    expect(resultado).toMatchObject({
      id_curso: 2,
      curso: 'SEGUNDO_ANO',
      cantidad_semanas: 3,
      incluye_borrador: true,
    });
    expect(resultado.cadetes[0]).toMatchObject({
      id_cadete: 101,
      total_meritos: '5.0000',
      total_demeritos: '5.5000',
    });
    expect(
      resultado.cadetes[0].semanas.map((semana) => semana.total_demeritos),
    ).toEqual(['2.0000', '3.5000', '0.0000']);
    expect(resultado.cadetes[0].semanas[0].detalles[0]).toMatchObject({
      id_registro: 1,
      estado: EstadoSemanaDisciplina.BORRADOR,
    });
    expect(resultado.cadetes[1]).toMatchObject({
      id_cadete: 102,
      total_meritos: '0.0000',
      total_demeritos: '0.0000',
    });
    expect(
      resultado.cadetes[1].semanas.map((semana) => semana.total_demeritos),
    ).toEqual(['0.0000', '0.0000', '0.0000']);
  });

  it('deriva el curso del operador y consulta los cadetes en el orden institucional', async () => {
    await servicio.cuadroDemostrativo(21, filtros);

    expect(validaciones.validarAccesoCurso).toHaveBeenCalledWith(
      21,
      2,
      'LECTURA',
    );
    expect(prisma.cadete.findMany).toHaveBeenCalledWith({
      where: { id_curso: 2 },
      include: {
        usuario: { select: { ci: true, nombres: true, apellidos: true } },
      },
      orderBy: [{ usuario: { apellidos: 'asc' } }, { id_cadete: 'asc' }],
    });
    expect(prisma.registroDisciplina.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          semana: {
            id_periodo: 11,
            id_curso: 2,
            numero_semana: { gte: 1, lte: 3 },
          },
        },
      }),
    );
  });

  it('rechaza perfiles ajenos y operadores sin una asignación única', async () => {
    validaciones.obtenerPerfil.mockResolvedValueOnce({
      ...perfilOperador,
      tipo: 'ENCARGADO_DISCIPLINA',
    });
    await expect(
      servicio.cuadroDemostrativo(21, filtros),
    ).rejects.toBeInstanceOf(ForbiddenException);

    validaciones.obtenerPerfil.mockResolvedValueOnce({
      ...perfilOperador,
      cursos_asignados: [1, 2],
    });
    await expect(
      servicio.cuadroDemostrativo(21, filtros),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.periodoLectivo.findUnique).not.toHaveBeenCalled();
  });

  it('rechaza id_curso como parámetro para impedir cambiar el curso por URL', async () => {
    const dto = plainToInstance(ConsultarCuadroDemostrativoDisciplinaDto, {
      id_gestion: 7,
      id_periodo: 11,
      id_curso: 1,
    });

    const errores = await validate(dto, {
      whitelist: true,
      forbidNonWhitelisted: true,
    });

    expect(errores).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ property: 'id_curso' }),
      ]),
    );
  });
});
