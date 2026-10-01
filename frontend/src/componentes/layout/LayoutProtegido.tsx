'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contextos/AuthContext';
import BarraSuperior from './BarraSuperior';
import BarraLateral from './BarraLateral';
import PresenciaCliente from '../presencia/PresenciaCliente';

export default function LayoutProtegido({children}:{children:React.ReactNode}){
 const router=useRouter(),{usuario,cargando}=useAuth();const [abierto,setAbierto]=useState(false),[compacto,setCompacto]=useState(false);
 useEffect(()=>{if(!cargando&&!usuario)router.replace('/iniciar-sesion')},[cargando,usuario,router]);
 if(cargando||!usuario)return <div className="flex min-h-screen items-center justify-center"><div className="h-12 w-12 animate-spin rounded-full border-2 border-[var(--color-military-green)] border-t-transparent"/></div>;
 return <div className="min-h-screen overflow-x-hidden bg-[var(--color-background)]">
  <PresenciaCliente/>
  <BarraLateral abierto={abierto} compacto={compacto} cerrar={()=>setAbierto(false)}/>
  {abierto&&<button aria-label="Cerrar menú" onClick={()=>setAbierto(false)} className="fixed inset-0 z-30 bg-black/50 lg:hidden"/>}
  <div className={`min-w-0 transition-[margin] duration-200 ${compacto?'lg:ml-20':'lg:ml-64'}`}>
   <BarraSuperior abrirMenu={()=>setAbierto(true)} alternarCompacto={()=>setCompacto(v=>!v)} compacto={compacto}/>
   <main className="min-w-0 overflow-x-hidden p-3 sm:p-5 lg:p-8">{children}</main>
  </div>
 </div>;
}
