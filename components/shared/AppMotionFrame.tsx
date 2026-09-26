"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { usePathname } from "next/navigation";

export default function AppMotionFrame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const initial = reduceMotion
    ? { opacity: 1 }
    : { opacity: 0, y: 12 };
  const animate = reduceMotion
    ? { opacity: 1 }
    : { opacity: 1, y: 0 };
  const exit = reduceMotion
    ? { opacity: 0 }
    : { opacity: 0, y: -8 };

  return (
    <>
      <AnimatePresence mode="wait" initial>
        <motion.div
          key={pathname}
          className="app-route-motion-frame min-h-[100dvh]"
          initial={initial}
          animate={animate}
          exit={exit}
          transition={{ duration: reduceMotion ? 0 : 0.24, ease: [0.16, 1, 0.3, 1] }}
        >
          {children}
        </motion.div>
      </AnimatePresence>

    </>
  );
}
