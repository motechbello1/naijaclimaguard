import type { Metadata } from "next";
import { Providers } from "./providers";
import ServiceWorkerRegister from "@/components/shared/ServiceWorkerRegister";
import "./globals.css";
import "./dark-contrast.css";

export const metadata: Metadata = {
  title: "NaijaClimaGuard — Nigeria Flood Risk Intelligence",
  description:
    "Nigeria-focused flood-risk decision support with live location monitoring, auditable risk context, and an independent validation pipeline for NASA, GloFAS, and ERA5-Land data.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/brand/favicon-light.svg", type: "image/svg+xml", media: "(prefers-color-scheme: light)" },
      { url: "/brand/favicon-dark.svg", type: "image/svg+xml", media: "(prefers-color-scheme: dark)" },
    ],
    shortcut: "/brand/favicon-dark.svg",
    apple: "/brand/naijaclimaguard-mark.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#f7f7f2" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#071713" />
      </head>
      <body className="min-h-screen bg-cloud dark:bg-midnight text-slate-900 dark:text-slate-200 font-body antialiased transition-colors duration-[350ms]">
        <Providers>
          <ServiceWorkerRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
