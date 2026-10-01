import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AuditoriaService } from '../../auditoria/auditoria.service';
import { ValidacionesNotasService } from '../comun/validaciones-notas.service';
import { PERMISOS_NOTAS } from '../comun/constantes-notas';
import {
  ActualizarOficialDisciplinaDto,
  CrearOficialDisciplinaDto,
  FiltrarOficialesDisciplinaDto,
} from './dto/oficial-disciplina.dto';

@Injectable()
export class OficialDisciplinaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly validaciones: ValidacionesNotasService,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(idUsuario: number, filtros: FiltrarOficialesDisciplinaDto) {
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
    return this.prisma.oficialDisciplina.findMany({
      where: {
        activo: filtros.solo_activos === false ? undefined : true,
        OR: buscar
          ? [
              { codigo: { contains: buscar, mode: 'insensitive' } },
              { nombre_completo: { contains: buscar, mode: 'insensitive' } },
            ]
          : undefined,
      },
      orderBy: [{ activo: 'desc' }, { nombre_completo: 'asc' }],
    });
  }

  async crear(idUsuario: number, dto: CrearOficialDisciplinaDto) {
    await this.exigirEncargado(idUsuario);
    const datos = {
      codigo: dto.codigo.trim().toUpperCase(),
      nombre_completo: dto.nombre_completo.trim(),
      id_creador: idUsuario,
    };
    return this.prisma.$transaction(async (tx) => {
      const creado = await tx.oficialDisciplina.create({ data: datos });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'CREAR_OFICIAL',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'OficialDisciplina',
          id_entidad: creado.id_oficial,
          descripcion: 'Oficial real registrado en Disciplina.',
          datos_despues: this.aJson(creado),
        },
        tx,
      );
      return creado;
    });
  }

  async actualizar(
    idUsuario: number,
    idOficial: number,
    dto: ActualizarOficialDisciplinaDto,
  ) {
    await this.exigirEncargado(idUsuario);
    const actual = await this.obtener(idOficial);
    const datos: Prisma.OficialDisciplinaUpdateInput = {};
    if (dto.codigo !== undefined)
      datos.codigo = dto.codigo.trim().toUpperCase();
    if (dto.nombre_completo !== undefined) {
      datos.nombre_completo = dto.nombre_completo.trim();
    }
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.oficialDisciplina.update({
        where: { id_oficial: idOficial },
        data: datos,
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: 'ACTUALIZAR_OFICIAL',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'OficialDisciplina',
          id_entidad: idOficial,
          descripcion: 'Datos del oficial actualizados.',
          datos_antes: this.aJson(actual),
          datos_despues: this.aJson(actualizado),
        },
        tx,
      );
      return actualizado;
    });
  }

  desactivar(idUsuario: number, idOficial: number) {
    return this.cambiarEstado(idUsuario, idOficial, false);
  }

  reactivar(idUsuario: number, idOficial: number) {
    return this.cambiarEstado(idUsuario, idOficial, true);
  }

  private async cambiarEstado(
    idUsuario: number,
    idOficial: number,
    activo: boolean,
  ) {
    await this.exigirEncargado(idUsuario);
    const actual = await this.obtener(idOficial);
    if (actual.activo === activo) return actual;
    return this.prisma.$transaction(async (tx) => {
      const actualizado = await tx.oficialDisciplina.update({
        where: { id_oficial: idOficial },
        data: { activo },
      });
      await this.auditoria.registrar(
        {
          id_usuario: idUsuario,
          accion: activo ? 'REACTIVAR_OFICIAL' : 'DESACTIVAR_OFICIAL',
          modulo: 'NOTAS_DISCIPLINA',
          entidad: 'OficialDisciplina',
          id_entidad: idOficial,
          descripcion: activo ? 'Oficial reactivado.' : 'Oficial desactivado.',
          datos_antes: { activo: actual.activo },
          datos_despues: { activo },
        },
        tx,
      );
      return actualizado;
    });
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

  private async obtener(idOficial: number) {
    const oficial = await this.prisma.oficialDisciplina.findUnique({
      where: { id_oficial: idOficial },
    });
    if (!oficial) throw new NotFoundException('Oficial no encontrado.');
    return oficial;
  }

  private aJson(oficial: {
    codigo: string;
    nombre_completo: string;
    activo: boolean;
  }): Prisma.InputJsonObject {
    return {
      codigo: oficial.codigo,
      nombre_completo: oficial.nombre_completo,
      activo: oficial.activo,
    };
  }
}
