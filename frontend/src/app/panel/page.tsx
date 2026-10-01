'use client';

import LayoutProtegido from '../../componentes/layout/LayoutProtegido';
import { useAuth } from '../../contextos/AuthContext';

export default function Panel() {
  const { usuario } = useAuth();

  if (!usuario) return <LayoutProtegido>{null}</LayoutProtegido>;

  return (
    <LayoutProtegido>
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-[var(--color-night-blue)] mb-8">Panel Principal</h1>

        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200 mb-8">
          <h2 className="text-xl font-semibold text-[var(--color-military-green-dark)] mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Información del Usuario
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm text-gray-500 font-medium">Nombres y Apellidos</p>
              <p className="text-lg font-semibold text-gray-900">{usuario.nombres} {usuario.apellidos}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Carnet de Identidad</p>
              <p className="text-lg font-semibold text-gray-900">{usuario.ci}</p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Rol Asignado</p>
              <p className="inline-flex items-center px-3 py-1 mt-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                {usuario.rol || 'Sin Rol'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Sección</p>
              <p className="text-lg font-semibold text-gray-900">{usuario.seccion || 'Sin Sección'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white shadow-md rounded-lg p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-[var(--color-military-green-dark)] mb-4 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
            Permisos Asignados
          </h2>
          <div className="flex flex-wrap gap-2">
            {usuario.permisos && usuario.permisos.length > 0 ? (
              [...usuario.permisos].sort().map((permiso, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-[#1b4332] text-[#d4af37] rounded-md text-xs font-bold tracking-wider border border-[#2d6a4f] shadow-sm uppercase flex items-center gap-1.5">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                  {permiso.replace(/_/g, ' ')}
                </span>
              ))
            ) : (
              <p className="text-gray-500 italic">No tiene permisos específicos asignados.</p>
            )}
          </div>
        </div>
      </div>
    </LayoutProtegido>
  );
}
