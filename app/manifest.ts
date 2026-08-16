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
      { src: "/brand/favicon-light.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/brand/favicon-dark.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
