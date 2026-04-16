import type { Metadata } from "next";
import { Providers } from "./providers";
import "./globals.css";

export const metadata: Metadata = {
  title: "NaijaClimaGuard — Physical Risk Intelligence for Africa",
  description: "AI-powered flood risk prediction. 48-hour advance warnings. ROC-AUC 0.9928.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      </head>
      <body className="min-h-screen bg-cloud dark:bg-midnight text-slate-900 dark:text-slate-200 font-body antialiased transition-colors duration-300">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}