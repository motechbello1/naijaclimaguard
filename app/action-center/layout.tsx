"use client";

import { ExperienceProfileProvider } from "@/components/shared/ExperienceProfile";

export default function ActionCenterLayout({ children }: { children: React.ReactNode }) {
  return <ExperienceProfileProvider>{children}</ExperienceProfileProvider>;
}
