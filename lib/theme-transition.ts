let clearTransition: number | undefined;

/** Animate only an intentional theme change, never the initial page paint. */
export function transitionTheme(setTheme: (theme: string) => void, nextTheme: "light" | "dark") {
  if (typeof window === "undefined" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(nextTheme);
    return;
  }

  if (clearTransition) window.clearTimeout(clearTransition);
  document.documentElement.classList.add("ncg-theme-transitioning");
  setTheme(nextTheme);
  clearTransition = window.setTimeout(() => {
    document.documentElement.classList.remove("ncg-theme-transitioning");
    clearTransition = undefined;
  }, 650);
}
