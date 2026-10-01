'use client';
import { useAuth } from '../../contextos/AuthContext';
import CampanaNotificaciones from '../notificaciones/CampanaNotificaciones';
export default function BarraSuperior({abrirMenu,alternarCompacto,compacto}:{abrirMenu:()=>void;alternarCompacto:()=>void;compacto:boolean}){
 const {usuario,logout}=useAuth();
 return <header className="sticky top-0 z-20 flex h-16 min-w-0 items-center justify-between border-b bg-white px-3 shadow-sm sm:px-6">
  <div className="flex min-w-0 items-center gap-2"><button onClick={abrirMenu} className="rounded border p-2 lg:hidden" aria-label="Abrir menú">☰</button><button onClick={alternarCompacto} className="hidden rounded border p-2 lg:block" aria-label="Contraer menú">{compacto?'→':'←'}</button><span className="truncate font-semibold text-[var(--color-military-green-dark)]">EMSE - Panel Institucional</span></div>
  <div className="flex shrink-0 items-center gap-3"><CampanaNotificaciones/><div className="hidden text-right sm:block"><p className="text-sm font-semibold">{usuario?.nombres} {usuario?.apellidos}</p><p className="text-xs text-gray-500">{usuario?.rol}</p></div><button onClick={()=>confirm('¿Está seguro que desea cerrar sesión?')&&logout()} className="rounded-lg border-2 border-red-800 bg-red-100 p-2 text-red-800 transition hover:bg-red-600 hover:text-white active:scale-95" title="Cerrar sesión">↪</button></div>
 </header>;
}
