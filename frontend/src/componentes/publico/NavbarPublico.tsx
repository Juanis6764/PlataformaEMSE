import Image from "next/image";

export default function NavbarPublico() {
  return (
    <nav className="bg-[var(--color-military-green-dark)] text-white shadow-lg sticky top-0 z-50 border-b-2 border-[var(--color-soft-gold)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-center h-20 items-center">
          <div className="flex items-center gap-4">
            <div className="relative w-14 h-14 bg-white/10 rounded-full p-1 drop-shadow-md">
              <Image
                src="/imagenes/logoemse.png"
                alt="Logo EMSE"
                fill
                className="object-contain drop-shadow-lg"
              />
            </div>
            <span className="font-extrabold text-2xl tracking-widest text-[var(--color-soft-gold)] uppercase drop-shadow-sm">
              EMSE
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}
