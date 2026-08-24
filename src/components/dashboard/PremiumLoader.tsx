import React from "react";
import { m, useReducedMotion } from "framer-motion";
import { EASE_OUT_EXPO } from "./Shared";

export function PremiumLoader() {
  const reduce = useReducedMotion();
  return (
    <div className="relative flex h-full min-h-[60vh] items-center justify-center p-8 z-10">
      <m.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
        className="relative flex h-36 w-36 items-center justify-center rounded-[2rem] border border-border bg-muted shadow-[0_20px_70px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl"
      >
        <m.span
          animate={reduce ? undefined : { scale: [1, 1.35, 1], opacity: [0.5, 0, 0.5] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform, opacity" }}
          className="absolute h-24 w-24 rounded-full bg-indigo-500/25 blur-2xl"
        />
        <m.span
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
          style={{
            willChange: "transform",
            background: "conic-gradient(from 0deg, transparent 0deg, rgba(99,102,241,0.15) 120deg, #818cf8 300deg, #e0e7ff 360deg)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 3px), #000 calc(100% - 3px))",
          }}
          className="absolute h-16 w-16 rounded-full"
        />
        <m.span
          animate={reduce ? undefined : { rotate: -360 }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
          className="absolute h-9 w-9 rounded-full border border-border border-t-white/60"
        />
        <m.span
          animate={reduce ? undefined : { opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          className="h-1.5 w-1.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
        />
      </m.div>
    </div>
  );
}
