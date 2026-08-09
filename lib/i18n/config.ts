export type AppLocale = "en" | "pcm" | "ha" | "yo" | "ig";

export const APP_LANGUAGES: Array<{ code: AppLocale; label: string; nativeLabel: string }> = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "pcm", label: "Nigerian Pidgin", nativeLabel: "Naija Pidgin" },
  { code: "ha", label: "Hausa", nativeLabel: "Hausa" },
  { code: "yo", label: "Yoruba", nativeLabel: "Yorùbá" },
  { code: "ig", label: "Igbo", nativeLabel: "Igbo" },
];

export const NEXT_LANGUAGE_PACKS = ["Fulfulde", "Tiv", "Kanuri", "Ibibio/Efik"] as const;

export const LOCALE_STORAGE_KEY = "naijaclimaguard-language";

export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && APP_LANGUAGES.some((item) => item.code === value);
}
