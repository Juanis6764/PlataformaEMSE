import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../contextos/AuthContext";

export const metadata: Metadata = {
  title: "EMSE - Plataforma Institucional",
  description: "Plataforma Institucional de Gestión Documental y Académica de la Escuela Militar de Sargentos del Ejército",
  icons: {
    icon: '/imagenes/logoemse.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        <link rel="icon" href="/imagenes/logoemse.png" />
      </head>
      <body className="min-h-full flex flex-col bg-[var(--color-background)]">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
