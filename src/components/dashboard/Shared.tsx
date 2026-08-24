import React, { useState, useRef, useCallback, useEffect } from "react";
import { m, AnimatePresence, useReducedMotion, useInView, animate, useMotionValue, useMotionValueEvent } from "framer-motion";
import { Link } from "react-router-dom";

export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_SOFT = [0.22, 1, 0.36, 1] as const;
export const SPRING_SNAPPY = { type: "spring", stiffness: 320, damping: 28, mass: 0.7 } as const;
export const SPRING_SILK = { type: "spring", stiffness: 140, damping: 22, mass: 0.9 } as const;
export const NOISE_URI = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.45'/%3E%3C/svg%3E\")";

export interface Ripple { id: number; x: number; y: number; }
export function useRipple() {
  const [ripples, setRipples] = useState<Ripple[]>([]);
  const idRef = useRef(0);
  const spawn = useCallback((e: React.PointerEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const id = ++idRef.current;
    setRipples((prev) => [...prev, { id, x: e.clientX - rect.left, y: e.clientY - rect.top }]);
    window.setTimeout(() => setRipples((prev) => prev.filter((r) => r.id !== id)), 700);
  }, []);
  return { ripples, spawn };
}

export function RippleLayer({ ripples }: { ripples: Ripple[] }) {
  return (
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
      <AnimatePresence>
        {ripples.map((r) => (
          <m.span
            key={r.id}
            initial={{ opacity: 0.45, scale: 0 }}
            animate={{ opacity: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.65, ease: EASE_OUT_EXPO }}
            style={{ left: r.x, top: r.y, willChange: "transform, opacity" }}
            className="absolute h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.55)_0%,rgba(255,255,255,0)_65%)]"
          />
        ))}
      </AnimatePresence>
    </span>
  );
}

const MotionLink = m(Link) as any;

export function PrimaryLinkButton({ to, children, className }: { to: string; children: React.ReactNode; className?: string; }) {
  const { ripples, spawn } = useRipple();
  return (
    <div className={`group relative block w-full sm:w-auto ${className || ""}`}>
      <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/50 via-sky-400/50 to-emerald-400/50 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
      <MotionLink
        to={to}
        onPointerDown={spawn}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING_SNAPPY}
        style={{ willChange: "transform" }}
        className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--btn-primary-bg)] px-5 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_10px_30px_-12px_rgba(255,255,255,0.5)] transition-shadow duration-300 group-hover:shadow-[0_16px_44px_-12px_rgba(129,140,248,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708] sm:w-auto"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-sky-100 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-[60%] w-1/3 skew-x-[-20deg] bg-white/70 opacity-0 blur-md transition-all duration-700 group-hover:left-[120%] group-hover:opacity-90" />
        <span className="pointer-events-none relative z-10 flex items-center gap-2">{children}</span>
        <RippleLayer ripples={ripples} />
      </MotionLink>
    </div>
  );
}

export function PrimaryButton({ onClick, children, className }: { onClick: () => void; children: React.ReactNode; className?: string; }) {
  const { ripples, spawn } = useRipple();
  return (
    <div className={`group relative block w-full sm:w-auto ${className || ""}`}>
      <span aria-hidden className="pointer-events-none absolute -inset-1 rounded-xl bg-gradient-to-r from-indigo-500/50 via-sky-400/50 to-emerald-400/50 opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-100" />
      <m.button
        onClick={onClick}
        onPointerDown={spawn}
        whileHover={{ y: -2, scale: 1.02 }}
        whileTap={{ scale: 0.97 }}
        transition={SPRING_SNAPPY}
        style={{ willChange: "transform" }}
        className="relative flex h-11 w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-[var(--btn-primary-bg)] px-5 text-sm font-semibold text-[var(--btn-primary-text)] shadow-[0_10px_30px_-12px_rgba(255,255,255,0.5)] transition-shadow duration-300 group-hover:shadow-[0_16px_44px_-12px_rgba(129,140,248,0.75)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#070708] sm:w-auto"
      >
        <span aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-r from-indigo-100 via-white to-sky-100 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 -left-[60%] w-1/3 skew-x-[-20deg] bg-white/70 opacity-0 blur-md transition-all duration-700 group-hover:left-[120%] group-hover:opacity-90" />
        <span className="pointer-events-none relative z-10 flex items-center gap-2">{children}</span>
        <RippleLayer ripples={ripples} />
      </m.button>
    </div>
  );
}

export function Reveal({ children, className, delay = 0, y = 34, scaleFrom = 0.97 }: { children: React.ReactNode; className?: string; delay?: number; y?: number; scaleFrom?: number; }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-90px 0px -90px 0px" });

  return (
    <m.div
      ref={ref}
      initial={reduce ? undefined : { opacity: 0, y, scale: scaleFrom, filter: "blur(10px)" }}
      animate={reduce || inView ? { opacity: 1, y: 0, scale: 1, filter: "blur(0px)" } : undefined}
      transition={{ duration: 0.85, ease: EASE_OUT_EXPO, delay }}
      style={{ willChange: "transform, opacity, filter" }}
      className={className}
    >
      {children}
    </m.div>
  );
}

export function AnimatedNumber({ value, suffix = "" }: { value: number; suffix?: string }) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const mv = useMotionValue(0);
  const [display, setDisplay] = useState(0);

  useMotionValueEvent(mv, "change", (v) => setDisplay(v));

  useEffect(() => {
    if (!inView) return;
    if (reduce) {
      setDisplay(value);
      return;
    }
    const controls = animate(mv, value, { duration: 1.4, ease: EASE_OUT_EXPO });
    return () => controls.stop();
  }, [inView, value, reduce, mv]);

  return <span ref={ref} className="tabular-nums">{Math.round(display)}{suffix}</span>;
}
