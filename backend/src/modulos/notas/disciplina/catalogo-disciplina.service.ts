import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TipoDisciplina } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  ActualizarCatalogoDisciplinaDto,
  CrearCatalogoDisciplinaDto,
  FiltrarCatalogoDisciplinaDto,
} from './dto/catalogo-disciplina.dto';

@Injectable()
export class CatalogoDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(idUsuario: number, filtros: FiltrarCatalogoDisciplinaDto) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_DISCIPLINA',
      'OPERADOR_DISCIPLINA',
      'SECCION_ACADEMICA',
      'JEFE_ESTUDIOS',
    );
    const buscar = filtros.buscar?.trim();
    const filas = await this.prisma.catalogoDisciplina.findMany({
      where: {
        tipo: filtros.tipo,
        activo: filtros.solo_activos === false ? undefined : true,
        OR: buscar
          ? [
              { codigo: { contains: buscar, mode: 'insensitive' } },
              { nombre: { contains: buscar, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ tipo: 'asc' }, { activo: 'desc' }, { nombre: 'asc' }],
    });
    return filas.map((fila) => this.presentar(fila));
  }

  async crear(idUsuario: number, dto: CrearCatalogoDisciplinaDto) {
    await this.exigirEncargado(idUsuario);
    const puntajeBase = this.validarPuntaje(dto.tipo, dto.puntaje_base);
    return this.prisma.$transaction(async (tx) => {
      const creado = await tx.catalogoDisciplina.create({
        data: {
          tipo: dto.tipo,
          codigo: dto.codigo.trim().toUpperCase(),
          nombre: dto.nombre.trim(),
          puntaje_base: puntajeBase,
          id_creador: idUsuario,
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_CATALOGO',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'CatalogoDisciplina',
          id_entidad: creado.id_catalogo,
          descripcion: 'Ítem real del catálogo disciplinario creado.',
          datos_despues: this.aJson(creado),
        },
        tx,
      );
      return this.presentar(creado);
    });
  }

  async actualizar(
    idUsuario: number,
    idCatalogo: number,
    dto: ActualizarCatalogoDisciplinaDto,
  ) {
    await this.exigirEncargado(idUsuario);
    const actual = await this.obtener(idCatalogo);
    const usado = await this.prisma.registroDisciplina.count({
      where: { id_catalogo: idCatalogo },
    });
    const tipo = dto.tipo ?? actual.tipo;
    const valorPuntaje =
      tipo === TipoDisciplina.MERITO
        ? dto.puntaje_base
        : (dto.puntaje_base ?? actual.puntaje_base?.toFixed(4));
    const puntaje = this.validarPuntaje(tipo, valorPuntaje);

    if (
      usado > 0 &&
      ((dto.tipo !== undefined && dto.tipo !== actual.tipo) ||
        (dto.codigo !== undefined &&
          dto.codigo.trim().toUpperCase() !== actual.codigo) ||
        (dto.puntaje_base !== undefined &&
          !new Prisma.Decimal(dto.puntaje_base).equals(
            actual.puntaje_base ?? new Prisma.Decimal(0),
          )))
    ) {
      throw new BadRequestException(
        'No puede cambiar tipo, código ni puntaje de un catálogo ya utilizado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.catalogoDisciplina.update({
        where: { id_catalogo: idCatalogo },
        data: {
          tipo: dto.tipo,
          codigo: dto.codigo?.trim().toUpperCase(),
          nombre: dto.nombre?.trim(),
          puntaje_base: puntaje,
        },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ACTUALIZAR_CATALOGO',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'CatalogoDisciplina',
          id_entidad: idCatalogo,
          descripcion: 'Ítem del catálogo disciplinario actualizado.',
          datos_antes: this.aJson(actual),
          datos_despues: this.aJson(actualizado),
        },
        tx,
      );
      return this.presentar(actualizado);
    });
  }

  desactivar(idUsuario: number, idCatalogo: number) {
    return this.cambiarEstado(idUsuario, idCatalogo, false);
  }

  reactivar(idUsuario: number, idCatalogo: number) {
    return this.cambiarEstado(idUsuario, idCatalogo, true);
  }

  private async cambiarEstado(
    idUsuario: number,
    idCatalogo: number,
    activo: boolean,
  ) {
    await this.exigirEncargado(idUsuario);
    const actual = await this.obtener(idCatalogo);
    if (actual.activo === activo) return this.presentar(actual);
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.catalogoDisciplina.update({
        where: { id_catalogo: idCatalogo },
        data: { activo },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: activo ? 'REACTIVAR_CATALOGO' : 'DESACTIVAR_CATALOGO',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'CatalogoDisciplina',
          id_entidad: idCatalogo,
          descripcion: activo
            ? 'Catálogo reactivado.'
            : 'Catálogo desactivado.',
          datos_antes: { activo: actual.activo },
          datos_despues: { activo },
        },
        tx,
      );
      return this.presentar(actualizado);
    });
  }

  private validarPuntaje(tipo: TipoDisciplina, valor?: string) {
    if (tipo === TipoDisciplina.MERITO) {
      if (valor !== undefined) {
        throw new BadRequestException(
          'El catálogo de méritos no admite puntaje fijo.',
        );
      }
      return null;
    }
    if (valor === undefined) {
      throw new BadRequestException(
        'El catálogo de deméritos requiere puntaje fijo.',
      );
    }
    const puntaje = new Prisma.Decimal(valor);
    if (
      !puntaje.isInteger() ||
      puntaje.lessThan(1) ||
      puntaje.greaterThan(10)
    ) {
      throw new BadRequestException(
        'El puntaje fijo de un demérito debe ser un entero entre 1 y 10.',
      );
    }
    return puntaje;
  }

  private async exigirEncargado(idUsuario: number) {
    const perfil = await this.validaciones.obtenerPerfil(idUsuario);
    this.validaciones.exigirTipo(
      perfil,
      'ADMINISTRADOR',
      'ENCARGADO_DISCIPLINA',
    );
    this.validaciones.exigirPermiso(
      perfil,
      PERMISOS_NOTAS.CONFIGURAR_DISCIPLINA,
    );
  }

  private async obtener(idCatalogo: number) {
    const catalogo = await this.prisma.catalogoDisciplina.findUnique({
      where: { id_catalogo: idCatalogo },
    });
    if (!catalogo) throw new NotFoundException('Catálogo no encontrado.');
    return catalogo;
  }

  private presentar<T extends { puntaje_base: Prisma.Decimal | null }>(
    fila: T,
  ) {
    return {
      ...fila,
      puntaje_base: fila.puntaje_base?.toFixed(4) ?? null,
    };
  }

  private aJson(fila: {
    tipo: TipoDisciplina;
    codigo: string;
    nombre: string;
    puntaje_base: Prisma.Decimal | null;
    activo: boolean;
  }): Prisma.InputJsonObject {
    return {
      tipo: fila.tipo,
      codigo: fila.codigo,
      nombre: fila.nombre,
      puntaje_base: fila.puntaje_base?.toFixed(4) ?? null,
      activo: fila.activo,
    };
  }
}
