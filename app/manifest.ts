import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NaijaClimaGuard",
    short_name: "ClimaGuard",
    description: "Nigeria-focused flood risk, warning delivery and early-action support.",
    start_url: "/my-area",
    display: "standalone",
    background_color: "#071713",
    theme_color: "#071713",
    categories: ["weather", "utilities", "productivity"],
    icons: [
      { src: "/brand/app-icon-192-v3.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon-512-v3.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/brand/app-icon-512-v3.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
