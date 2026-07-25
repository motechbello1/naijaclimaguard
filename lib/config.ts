/**
 * ML API endpoint — env-driven for production.
 * Set NEXT_PUBLIC_ML_API_URL in Vercel after deploying the ML service to Render.
 * Until then the app honestly falls back to the disclosed derived model.
 */
export const ML_API_URL =
  process.env.NEXT_PUBLIC_ML_API_URL ?? "https://naijaclimaguard-ml-api.onrender.com";
