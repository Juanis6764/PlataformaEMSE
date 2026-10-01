import { TipoSeccion } from '@prisma/client';

export const SECCIONES = [
  // Nivel 1 – Raíz institucional
  {
    nombre: 'ADMINISTRACION_SISTEMA',
    descripcion: 'Administración interna del sistema informático',
    nivel: 0,
    tipo: 'SISTEMA' as TipoSeccion,
    id_seccion_padre: null,
  },
  // Nivel 2 – Instancias de mando
  {
    nombre: 'COMANDO',
    descripcion: 'Comando General de la EMSE',
    nivel: 1,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'SEGUNDO_COMANDO',
    descripcion: 'Segundo Comando de la EMSE',
    nivel: 1,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  // Nivel 3 – Secretaría y áreas de apoyo
  {
    nombre: 'SECRETARIA_GENERAL',
    descripcion: 'Secretaría General de la EMSE',
    nivel: 2,
    tipo: 'DOCUMENTACION' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'RADIO',
    descripcion: 'Sección de Comunicaciones y Radio',
    nivel: 2,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  // Nivel 3 – Jefatura de Estudios y sus áreas
  {
    nombre: 'JEFATURA_ESTUDIOS',
    descripcion: 'Jefatura de Estudios Académicos',
    nivel: 2,
    tipo: 'ACADEMICA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'EVALUACIONES',
    descripcion: 'Área de Evaluaciones y Calificaciones',
    nivel: 3,
    tipo: 'ACADEMICA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'DISCIPLINA',
    descripcion: 'Área de Disciplina Militar',
    nivel: 3,
    tipo: 'ACADEMICA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'ENTRENAMIENTO_FISICO',
    descripcion: 'Área de Entrenamiento Físico',
    nivel: 3,
    tipo: 'ACADEMICA' as TipoSeccion,
    id_seccion_padre: null,
  },
  // Secciones de batallón y apoyo operacional
  {
    nombre: 'COMANDO_BATALLON',
    descripcion: 'Comando del Batallón de Cadetes',
    nivel: 2,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'INVESTIGACION_TECNOLOGIA',
    descripcion: 'Área de Investigación y Tecnología',
    nivel: 2,
    tipo: 'DOCUMENTACION' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'INTELIGENCIA',
    descripcion: 'Sección de Inteligencia',
    nivel: 2,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'OPERACIONES',
    descripcion: 'Sección de Operaciones',
    nivel: 2,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
  {
    nombre: 'LOGISTICA',
    descripcion: 'Sección de Logística y Abastecimiento',
    nivel: 2,
    tipo: 'ADMINISTRATIVA' as TipoSeccion,
    id_seccion_padre: null,
  },
];
