export default function FooterPublico() {
  return (
    <footer className="bg-[var(--color-night-blue)] text-gray-300 py-8 text-center text-sm border-t-4 border-[var(--color-soft-gold)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="font-bold text-[var(--color-soft-gold)] mb-2 uppercase tracking-wide">
          Escuela Militar de Sargentos del Ejército
        </p>
        <p>Plataforma Institucional de Gestión Documental y Académica.</p>
        <p className="mt-4 opacity-70">
          © {new Date().getFullYear()} EMSE. Todos los derechos reservados.
        </p>
      </div>
    </footer>
  );
}
