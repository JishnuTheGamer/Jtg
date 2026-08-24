import React, { useMemo } from "react";
import { m, useReducedMotion } from "framer-motion";
import { EASE_OUT_EXPO, NOISE_URI } from "./Shared";

export function AmbientBackground() {
  const reduce = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: `${(i * 37 + 11) % 100}%`,
        size: 1 + ((i * 7) % 3),
        delay: (i * 0.9) % 12,
        duration: 22 + ((i * 5) % 16),
        drift: ((i % 5) - 2) * 22,
      })),
    []
  );

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-10%,rgba(99,102,241,0.16),transparent_60%),radial-gradient(80%_60%_at_100%_100%,rgba(16,185,129,0.08),transparent_60%)]" />

      <m.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={reduce ? { opacity: 0.55, scale: 1 } : { opacity: 0.55, scale: 1, x: [0, 40, -20, 0], y: [0, -30, 20, 0] }}
        transition={reduce ? { duration: 1.4, ease: EASE_OUT_EXPO } : { opacity: { duration: 1.6, ease: EASE_OUT_EXPO }, scale: { duration: 1.8, ease: EASE_OUT_EXPO }, x: { duration: 34, repeat: Infinity, ease: "easeInOut" }, y: { duration: 28, repeat: Infinity, ease: "easeInOut" } }}
        style={{ willChange: "transform" }}
        className="absolute -top-40 left-[8%] h-[34rem] w-[34rem] rounded-full bg-indigo-600/25 blur-[140px]"
      />
      <m.div
        initial={{ opacity: 0, scale: 0.7 }}
        animate={reduce ? { opacity: 0.4, scale: 1 } : { opacity: 0.4, scale: 1, x: [0, -50, 30, 0], y: [0, 25, -25, 0] }}
        transition={reduce ? { duration: 1.4, ease: EASE_OUT_EXPO } : { opacity: { duration: 1.8, delay: 0.15, ease: EASE_OUT_EXPO }, scale: { duration: 2, delay: 0.15, ease: EASE_OUT_EXPO }, x: { duration: 40, repeat: Infinity, ease: "easeInOut" }, y: { duration: 33, repeat: Infinity, ease: "easeInOut" } }}
        style={{ willChange: "transform" }}
        className="absolute -right-32 top-[22%] h-[30rem] w-[30rem] rounded-full bg-sky-500/20 blur-[150px]"
      />
      <m.div
        initial={{ opacity: 0, scale: 0.75 }}
        animate={reduce ? { opacity: 0.3, scale: 1 } : { opacity: 0.3, scale: 1, x: [0, 30, -30, 0] }}
        transition={reduce ? { duration: 1.4 } : { opacity: { duration: 2, delay: 0.3, ease: EASE_OUT_EXPO }, scale: { duration: 2.2, delay: 0.3, ease: EASE_OUT_EXPO }, x: { duration: 46, repeat: Infinity, ease: "easeInOut" } }}
        style={{ willChange: "transform" }}
        className="absolute bottom-[-12rem] left-[30%] h-[28rem] w-[40rem] rounded-full bg-fuchsia-600/12 blur-[160px]"
      />

      {!reduce && particles.map((p) => (
        <m.span
          key={p.id}
          initial={{ opacity: 0, y: "105vh" }}
          animate={{ opacity: [0, 0.5, 0.5, 0], y: "-10vh", x: p.drift }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "linear" }}
          style={{ left: p.left, width: p.size, height: p.size, willChange: "transform, opacity" }}
          className="absolute rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]"
        />
      ))}

      <div className="absolute inset-0 opacity-[0.035] mix-blend-overlay" style={{ backgroundImage: NOISE_URI }} />
      <div className="absolute inset-0 bg-[radial-gradient(100%_100%_at_50%_50%,transparent_55%,rgba(0,0,0,0.55)_100%)]" />
    </div>
  );
}
