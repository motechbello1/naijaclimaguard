"use client";

import { motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function AppMotionFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  return (
    <motion.div
      key={pathname}
      className="app-route-motion-frame min-h-[100dvh]"
      initial={{ opacity: reduceMotion ? 1 : .88 }}
      animate={{ opacity: 1 }}
      transition={{ duration: reduceMotion ? 0 : .32, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
