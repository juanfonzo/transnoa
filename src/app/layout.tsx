import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { RoleSwitcher } from "@/components/RoleSwitcher";
import { getDemoRole } from "@/lib/demo-auth";
import { AppNav } from "@/components/AppNav";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Sistema de Viaticos - TRANSNOA",
  description: "Demo del flujo de viaticos para TRANSNOA.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const role = await getDemoRole();

  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-gradient-to-br from-slate-50 via-white to-amber-50 text-slate-950 antialiased`}
      >
        <div className="min-h-screen">
          <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-emerald-400 to-sky-500" />
          <header className="border-b border-slate-200/70 bg-white/90 backdrop-blur">
            <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="rounded-2xl bg-slate-900 px-3 py-2 text-xs font-semibold uppercase tracking-widest text-white">
                  POC
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transnoa S.A.
                  </p>
                  <h1 className="text-xl font-semibold text-slate-900">
                    Sistema de viaticos
                  </h1>
                  <p className="text-xs text-slate-500">
                    Flujo completo de solicitud, firma y pago.
                  </p>
                </div>
              </div>
              <RoleSwitcher currentRole={role} />
            </div>
          </header>
          <AppNav />
          <main className="mx-auto w-full max-w-6xl px-6 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
