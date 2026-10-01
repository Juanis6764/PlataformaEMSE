'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function AccesoRestringido() {
  const router = useRouter();

  const handleVolverInicio = () => {
    router.replace('/panel');
  };

  const handleContactarSoporte = () => {
    window.location.href = 'mailto:emse6765@gmail.com';
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#121212] p-4 font-sans">
      <div className="max-w-md w-full flex flex-col items-center">
        
        {/* Imagen Central con icono de candado rojo */}
        <div className="relative mb-6">
          <div className="w-56 h-56 bg-[#1a1a1a] rounded-xl border border-gray-800 flex items-center justify-center p-6 shadow-2xl relative">
            <div className="relative w-full h-full opacity-80 drop-shadow-2xl grayscale contrast-125">
              <Image src="/imagenes/logoemse.png" alt="Logo EMSE" fill className="object-contain" />
            </div>
            {/* Candado rojo en la esquina inferior derecha */}
            <div className="absolute -bottom-4 -right-4 bg-[#991b1b] p-3 rounded-xl border-2 border-[#121212] shadow-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                <rect width="8" height="10" x="8" y="9" rx="2" ry="2" fill="white" stroke="none" />
                <path d="M12 11v4" stroke="#991b1b" strokeWidth="2" />
              </svg>
            </div>
          </div>
        </div>
        
        {/* Etiqueta 403 */}
        <div className="bg-[#6b4e31] text-[#ffd8b5] text-xs font-bold px-4 py-1.5 rounded-md flex items-center gap-2 mb-6 tracking-wider uppercase shadow-md border border-[#856140]">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          ERROR 403: ACCESO RESTRINGIDO
        </div>
        
        <h2 className="text-3xl font-bold text-white text-center mb-4 tracking-tight">Acceso Restringido</h2>
        <p className="text-gray-300 text-center text-sm leading-relaxed mb-10 px-4">
          No cuenta con los permisos necesarios para acceder a esta sección. Contacte con el administrador del sistema para solicitar una actualización de sus privilegios.
        </p>

        <div className="flex w-full gap-4">
          <button
            onClick={handleVolverInicio}
            className="flex-1 bg-[#3f4a3c] hover:bg-[#4b5947] border border-[#5c6b57] text-[#c9e0c5] font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Volver al Inicio
          </button>
          <button
            onClick={handleContactarSoporte}
            className="flex-1 bg-[#262626] hover:bg-[#333333] border border-[#404040] text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-lg"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
            Contactar Soporte
          </button>
        </div>
      </div>
    </div>
  );
}
