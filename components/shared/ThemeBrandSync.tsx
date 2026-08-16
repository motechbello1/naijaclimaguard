"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function ThemeBrandSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const dark = resolvedTheme === "dark";
    const href = dark ? "/brand/favicon-dark.svg" : "/brand/favicon-light.svg";
    let icon = document.head.querySelector<HTMLLinkElement>("link[data-ncg-theme-icon]");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.dataset.ncgThemeIcon = "true";
      document.head.appendChild(icon);
    }
    icon.href = href;

    let themeMeta = document.head.querySelector<HTMLMetaElement>("meta[data-ncg-theme-color]");
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      themeMeta.dataset.ncgThemeColor = "true";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = dark ? "#071713" : "#f7f7f2";
  }, [resolvedTheme]);

  return null;
}
