"use client";

import { useEffect } from "react";
import { useTheme } from "next-themes";

export default function ThemeBrandSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) return;
    const sync = () => {
    const dark = (document.documentElement.dataset.fpTheme || resolvedTheme) === "dark";
    const href = dark ? "/brand/favicon-dark.svg?v=3" : "/brand/favicon-light.svg?v=3";
    let icon = document.head.querySelector<HTMLLinkElement>("link[data-ncg-theme-icon]");
    if (!icon) {
      icon = document.createElement("link");
      icon.rel = "icon";
      icon.type = "image/svg+xml";
      icon.dataset.ncgThemeIcon = "true";
      document.head.appendChild(icon);
    }
    icon.href = href;
    document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"], link[rel="shortcut icon"]').forEach((link) => {
      link.href = href;
      link.type = "image/svg+xml";
      link.removeAttribute("media");
    });

    let themeMeta = document.head.querySelector<HTMLMetaElement>("meta[data-ncg-theme-color]");
    if (!themeMeta) {
      themeMeta = document.createElement("meta");
      themeMeta.name = "theme-color";
      themeMeta.dataset.ncgThemeColor = "true";
      document.head.appendChild(themeMeta);
    }
    themeMeta.content = dark ? "#071713" : "#f7f7f2";
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-fp-theme"] });
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, [resolvedTheme]);

  return null;
}
