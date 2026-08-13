import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "Brigada Camarão — Sistema de Gestão",
  description: "Cadastro de bombeiros, escalas de eventos e financeiro.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body className="flex min-h-screen">
        <Sidebar />
        <main className="min-w-0 flex-1 px-8 py-6 pb-16">{children}</main>
      </body>
    </html>
  );
}
