import NavbarPublico from '../componentes/publico/NavbarPublico';
import FooterPublico from '../componentes/publico/FooterPublico';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-[var(--color-background)]">
      <NavbarPublico />
      
      <main className="flex-1">
        <section className="bg-[var(--color-military-green-dark)] text-white py-24 px-4 sm:px-6 lg:px-8 text-center relative overflow-hidden flex flex-col items-center justify-center min-h-[70vh]">
          <div className="absolute inset-0 opacity-30 pointer-events-none bg-[url('/imagenes/fondo2.jpeg')] bg-cover bg-center mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--color-military-green-dark)] pointer-events-none"></div>

          <div className="max-w-4xl mx-auto relative z-10">
            <div className="inline-flex items-center justify-center w-32 h-32 mb-6 rounded-full bg-white/10 p-2 shadow-[0_0_30px_rgba(212,175,55,0.4)] relative">
              <Image src="/imagenes/logoemse.png" alt="Logo EMSE" fill className="object-contain p-2 drop-shadow-xl" />
            </div>
            
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 text-white drop-shadow-lg">
              Escuela Militar de <span className="text-[var(--color-soft-gold)]">Sargentos del Ejército</span>
            </h1>
            <p className="text-xl md:text-2xl font-light mb-12 text-gray-200 drop-shadow-md max-w-3xl mx-auto">
              Plataforma Institucional de Gestión Documental y Académica
            </p>
            
            <div className="flex justify-center">
              <Link 
                href="/iniciar-sesion" 
                className="group relative inline-flex items-center justify-center gap-3 px-10 py-5 font-bold text-white transition-all duration-300 bg-[var(--color-military-green)] rounded-xl hover:bg-[var(--color-military-green-light)] hover:scale-105 hover:shadow-[0_10px_40px_-10px_rgba(45,106,79,0.8)] focus:outline-none focus:ring-4 focus:ring-[var(--color-soft-gold)] focus:ring-offset-2 focus:ring-offset-[var(--color-military-green-dark)] shadow-[inset_0_2px_4px_rgba(255,255,255,0.3),0_8px_20px_rgba(0,0,0,0.5)] border border-[var(--color-military-green-light)]"
              >
                <div className="bg-white/20 p-2 rounded-lg group-hover:bg-white/30 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><polyline points="10 17 15 12 10 7"/><line x1="15" y1="12" x2="3" y2="12"/></svg>
                </div>
                <span className="text-2xl tracking-wide uppercase">Iniciar sesión</span>
              </Link>
            </div>
          </div>
        </section>

        {/* Misión y Visión */}
        <section className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-[var(--color-military-green)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[var(--color-military-green-light)] p-2 rounded-full text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-night-blue)]">Misión</h2>
              </div>
              <p className="text-gray-700 leading-relaxed text-justify">
                La EMSE forma futuros profesionales con el grado de Sargento Inicial como Técnicos Superiores en Ciencia y Arte Militar Terrestre, con conocimientos militares, capacidad técnica, valores ético-morales, vocación de servicio, aptitud física y formación integral.
              </p>
            </div>
            <div className="bg-white p-8 rounded-lg shadow-md border-t-4 border-[var(--color-soft-gold)]">
              <div className="flex items-center gap-3 mb-4">
                <div className="bg-[var(--color-soft-gold)] p-2 rounded-full text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
                </div>
                <h2 className="text-2xl font-bold text-[var(--color-night-blue)]">Visión</h2>
              </div>
              <p className="text-gray-700 leading-relaxed text-justify">
                Constituirse en un instituto de pregrado de referencia para la formación de sargentos de las Fuerzas Armadas, aportando al Ejército recursos humanos de alta calidad profesional, con preparación operativa, técnica, física y sólidos valores institucionales.
              </p>
            </div>
          </div>
        </section>

        {/* Servicios */}
        <section className="bg-gray-100 py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <h2 className="text-3xl font-bold text-[var(--color-night-blue)] mb-12">Servicios de la Plataforma</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-[var(--color-military-green)] mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--color-night-blue)]">Área Administrativa</h3>
                <p className="text-gray-600">Control jerárquico y administración general del personal e instructores.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-[var(--color-military-green)] mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--color-night-blue)]">Gestión Documental</h3>
                <p className="text-gray-600">Registro, seguimiento y trazabilidad de documentos internos y externos.</p>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
                <div className="text-[var(--color-military-green)] mb-4 flex justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-[var(--color-night-blue)]">Consulta para Estudiantes</h3>
                <p className="text-gray-600">Acceso a historial académico y visualización de notas para estudiantes.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <FooterPublico />
    </div>
  );
}
