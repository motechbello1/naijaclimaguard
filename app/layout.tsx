import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaijaClimaGuard — Nigeria Flood Risk Intelligence",
  description:
    "Nigeria-focused flood-risk decision support with live location monitoring, auditable risk context, and an independent validation pipeline for NASA, GloFAS, and ERA5-Land data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="min-h-screen bg-cloud dark:bg-midnight text-slate-900 dark:text-slate-200 font-body antialiased transition-colors duration-[350ms]">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}