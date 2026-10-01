import { ForbiddenException } from '@nestjs/common';
import { ValidacionesDocumentalesService } from './validaciones-documentales.service';

function usuarioBase(overrides: Record<string, any> = {}) {
  return {
    id_usuario: 1,
    habilitado: true,
    rol: { nombre: 'ADMINISTRATIVO', permisos: [] },
    permisos_individuales: [],
    seccion: null,
    ...overrides,
  };
}

describe('ValidacionesDocumentalesService.obtenerPerfil', () => {
  function crearServicio(usuario: any) {
    const prisma = {
      usuario: { findUnique: jest.fn().mockResolvedValue(usuario) },
    } as any;
    return new ValidacionesDocumentalesService(prisma);
  }

  it('rol ADMINISTRADOR fuera de Administración => monitor ADMINISTRADOR', async () => {
    const servicio = crearServicio(
      usuarioBase({
        rol: { nombre: 'ADMINISTRADOR', permisos: [] },
        seccion: { id_seccion: 9, nombre: 'RADIO' },
      }),
    );
    const perfil = await servicio.obtenerPerfil(1);
    expect(perfil.tipo).toBe('ADMINISTRADOR');
  });

  it('rol ADMINISTRADOR en ADMINISTRACION_SISTEMA => actor operativo de Administración', async () => {
    const servicio = crearServicio(
      usuarioBase({
        rol: { nombre: 'ADMINISTRADOR', permisos: [] },
        seccion: {
          id_seccion: 9,
          nombre: 'ADMINISTRACION_SISTEMA',
        },
      }),
    );
    const perfil = await servicio.obtenerPerfil(1);
    expect(perfil.tipo).toBe('ADMINISTRACION');
    expect(servicio.esActorGlobal(perfil)).toBe(false);
    expect(servicio.crearFiltroConsulta(perfil)).not.toEqual({});
  });

  it.each([
    ['RADIO', 'RADIO'],
    ['SECRETARIA_GENERAL', 'SECRETARIA_GENERAL'],
    ['COMANDO', 'COMANDO'],
    ['SEGUNDO_COMANDO', 'SEGUNDO_COMANDO'],
    ['LOGISTICA', 'AREA'],
    ['CUALQUIER_OTRA_SECCION', 'AREA'],
  ])('sección %s => tipo %s', async (nombreSeccion, tipoEsperado) => {
    const servicio = crearServicio(
      usuarioBase({ seccion: { id_seccion: 5, nombre: nombreSeccion } }),
    );
    const perfil = await servicio.obtenerPerfil(1);
    expect(perfil.tipo).toBe(tipoEsperado);
  });

  it('sin sección asignada => tipo OTRO', async () => {
    const servicio = crearServicio(usuarioBase({ seccion: null }));
    const perfil = await servicio.obtenerPerfil(1);
    expect(perfil.tipo).toBe('OTRO');
    expect(perfil.id_seccion).toBeNull();
  });

  it('combina permisos del rol con overrides individuales (concedido añade, revocado quita)', async () => {
    const servicio = crearServicio(
      usuarioBase({
        rol: {
          nombre: 'ADMINISTRATIVO',
          permisos: [
            { permiso: { nombre: 'DOC_VER_DOCUMENTOS', estado: true } },
            { permiso: { nombre: 'DOC_ENVIAR_DOCUMENTO', estado: true } },
          ],
        },
        permisos_individuales: [
          {
            concedido: true,
            permiso: { nombre: 'DOC_ARCHIVAR_DOCUMENTO', estado: true },
          },
          {
            concedido: false,
            permiso: { nombre: 'DOC_ENVIAR_DOCUMENTO', estado: true },
          },
        ],
      }),
    );
    const perfil = await servicio.obtenerPerfil(1);
    expect(perfil.permisos.has('DOC_VER_DOCUMENTOS')).toBe(true);
    expect(perfil.permisos.has('DOC_ARCHIVAR_DOCUMENTO')).toBe(true);
    expect(perfil.permisos.has('DOC_ENVIAR_DOCUMENTO')).toBe(false);
  });

  it('usuario inhabilitado lanza ForbiddenException', async () => {
    const servicio = crearServicio(usuarioBase({ habilitado: false }));
    await expect(servicio.obtenerPerfil(1)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});

describe('ValidacionesDocumentalesService — guards', () => {
  const servicio = new ValidacionesDocumentalesService({} as any);

  it('exigirTipo rechaza un perfil fuera de la lista permitida', () => {
    expect(() =>
      servicio.exigirTipo(
        { id_usuario: 1, id_seccion: 1, tipo: 'RADIO', permisos: new Set() },
        'COMANDO',
      ),
    ).toThrow(ForbiddenException);
  });

  it('exigirPermiso rechaza si el permiso no está en el set', () => {
    expect(() =>
      servicio.exigirPermiso(
        {
          id_usuario: 1,
          id_seccion: 1,
          tipo: 'RADIO',
          permisos: new Set(['OTRO']),
        },
        'DOC_CREAR_DOCUMENTO',
      ),
    ).toThrow(ForbiddenException);
  });

  it('exigirSeccionActual rechaza el mismatch de sección incluso para ADMINISTRADOR (sin bypass)', () => {
    const perfilAdmin = {
      id_usuario: 1,
      id_seccion: 99,
      tipo: 'ADMINISTRADOR' as const,
      permisos: new Set<string>(),
    };
    expect(() =>
      servicio.exigirSeccionActual(perfilAdmin, { id_seccion_actual: 5 }),
    ).toThrow(ForbiddenException);
  });

  it('exigirSeccionActual pasa cuando la sección coincide', () => {
    const perfil = {
      id_usuario: 1,
      id_seccion: 5,
      tipo: 'RADIO' as const,
      permisos: new Set<string>(),
    };
    expect(() =>
      servicio.exigirSeccionActual(perfil, { id_seccion_actual: 5 }),
    ).not.toThrow();
  });

  it('la consulta global no agrega restricciones documentales', () => {
    const perfil = {
      id_usuario: 1,
      id_seccion: 99,
      tipo: 'ADMINISTRADOR' as const,
      permisos: new Set<string>(),
    };
    expect(servicio.crearFiltroConsulta(perfil)).toEqual({});
  });

  it('la consulta historica incluye seccion actual, movimientos y registros de participacion', () => {
    const perfil = {
      id_usuario: 7,
      id_seccion: 42,
      tipo: 'AREA' as const,
      permisos: new Set<string>(),
    };
    const filtro = JSON.stringify(servicio.crearFiltroConsulta(perfil));
    expect(filtro).toContain('id_seccion_actual');
    expect(filtro).toContain('id_seccion_origen');
    expect(filtro).toContain('id_seccion_destino');
    expect(filtro).toContain('historial');
    expect(filtro).toContain('cumplimientos');
    expect(filtro).toContain('observaciones');
    expect(filtro).toContain('proveidos');
    expect(filtro).toContain('plazo');
  });

  it('puedeConsultarDocumento devuelve false si no hay participacion', async () => {
    const prisma = {
      documento: { findFirst: jest.fn().mockResolvedValue(null) },
    } as any;
    const servicioConsulta = new ValidacionesDocumentalesService(prisma);
    const perfil = {
      id_usuario: 7,
      id_seccion: 42,
      tipo: 'AREA' as const,
      permisos: new Set<string>(),
    };

    await expect(
      servicioConsulta.puedeConsultarDocumento(perfil, 123),
    ).resolves.toBe(false);
    expect(prisma.documento.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ select: { id_documento: true } }),
    );
  });
});
