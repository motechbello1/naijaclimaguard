import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "NaijaClimaGuard",
    short_name: "ClimaGuard",
    description: "Nigeria-focused flood risk, warning delivery and early-action support.",
    start_url: "/my-area",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    categories: ["weather", "utilities", "productivity"],
  };
}
