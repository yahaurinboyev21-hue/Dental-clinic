import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Dental CRM",
  description: "Stomatologiya klinikasi uchun bemorlarni boshqarish tizimi",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="uz" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-sky-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
