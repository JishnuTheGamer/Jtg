import React, { useMemo, useRef } from "react";
import { m, useReducedMotion, useMotionValue, useSpring, useTransform, useMotionTemplate, Variants } from "framer-motion";
import { SPRING_SILK, SPRING_SNAPPY, AnimatedNumber } from "./Shared";

interface StatCardProps {
  title: string;
  value: string;
  icon: React.ReactNode;
  trend?: string;
  chartColor?: string;
  percentage?: number;
}

export function StatCard({ title, value, icon, trend, chartColor, percentage }: StatCardProps) {

  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);

  const itemAnim: Variants = {
    hidden: { opacity: 0, y: 20, scale: 0.96, filter: "blur(8px)" },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      filter: "blur(0px)",
      transition: { type: "spring", stiffness: 300, damping: 24 },
    },
  };

  const { numeric, suffix } = useMemo(() => {
    const match = /^(-?\d+(?:\.\d+)?)(.*)$/.exec(value.trim());
    return match ? { numeric: Number(match[1]), suffix: match[2] ?? "" } : { numeric: NaN, suffix: "" };
  }, [value]);

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const rotateX = useSpring(useTransform(py, [0, 1], [8, -8]), SPRING_SILK);
  const rotateY = useSpring(useTransform(px, [0, 1], [-8, 8]), SPRING_SILK);
  const lightX = useTransform(px, (v) => `${v * 100}%`);
  const lightY = useTransform(py, (v) => `${v * 100}%`);
  const spotlight = useMotionTemplate`radial-gradient(220px circle at ${lightX} ${lightY}, rgba(255,255,255,0.12), transparent 70%)`;

  const contentX = useSpring(useTransform(px, [0, 1], [-6, 6]), SPRING_SILK);
  const contentY = useSpring(useTransform(py, [0, 1], [-4, 4]), SPRING_SILK);

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (reduce || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    px.set((e.clientX - r.left) / r.width);
    py.set((e.clientY - r.top) / r.height);
  };
  const reset = () => { px.set(0.5); py.set(0.5); };

  return (
    <m.div
      ref={ref}
      variants={itemAnim}
      onPointerMove={handleMove}
      onPointerLeave={reset}
      whileHover={reduce ? undefined : { y: -8, scale: 1.015 }}
      transition={SPRING_SNAPPY}
      style={reduce ? undefined : { rotateX, rotateY, transformPerspective: 1100, willChange: "transform" }}
      className="group relative rounded-2xl p-[1px] z-10 shadow-[0_24px_70px_-30px_rgba(0,0,0,0.95)]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <m.span
          aria-hidden
          animate={reduce ? undefined : { rotate: 360 }}
          transition={{ duration: 9, repeat: Infinity, ease: "linear" }}
          style={{ willChange: "transform" }}
          className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,transparent_0deg,rgba(255,255,255,0.05)_90deg,rgba(129,140,248,0.65)_180deg,rgba(255,255,255,0.05)_270deg,transparent_360deg)] opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        />
      </div>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-2xl bg-gradient-to-b from-foreground/10 to-transparent" />

      <div className="relative h-full overflow-hidden rounded-2xl bg-card/80 p-5 backdrop-blur-2xl transition-colors duration-500 sm:p-6">
        <m.div
          aria-hidden
          animate={reduce ? undefined : { backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ backgroundSize: "220% 220%" }}
          className={`absolute inset-0 bg-gradient-to-br ${chartColor || "from-foreground/5"} opacity-[0.07] transition-opacity duration-500 group-hover:opacity-[0.16]`}
        />
        <m.div
          aria-hidden
          animate={reduce ? undefined : { y: [0, -10, 0], x: [0, 8, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut" }}
          style={{ willChange: "transform" }}
          className={`absolute -bottom-12 -right-12 h-44 w-44 bg-gradient-to-br ${chartColor || "from-foreground/5"} opacity-25 blur-[55px] transition-opacity duration-500 group-hover:opacity-50`}
        />
        {!reduce && (
          <m.div
            aria-hidden
            style={{ background: spotlight }}
            className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />
        )}
        <span aria-hidden className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-foreground/5 to-transparent" />
        <span aria-hidden className="absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-60" />

        <m.div style={reduce ? undefined : { x: contentX, y: contentY }} className="relative z-10 mb-5 flex items-start justify-between">
          <m.div
            animate={reduce ? undefined : { y: [0, -4, 0], rotate: [0, 3, 0, -3, 0] }}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            whileHover={reduce ? undefined : { scale: 1.14, rotate: 10 }}
            style={{ willChange: "transform" }}
            className="relative rounded-xl border border-border bg-muted p-3 shadow-inner"
          >
            <m.span
              aria-hidden
              animate={reduce ? undefined : { scale: [1, 1.5, 1], opacity: [0.35, 0, 0.35] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
              className={`absolute inset-0 rounded-xl bg-gradient-to-br ${chartColor || "from-foreground/5"} blur-md`}
            />
            <span className="relative z-10 block drop-shadow-[0_0_10px_rgba(255,255,255,0.25)]">{icon}</span>
          </m.div>
        </m.div>

        <m.div style={reduce ? undefined : { x: contentX, y: contentY }} className="relative z-10">
          <h3 className="mb-1 bg-gradient-to-b from-foreground to-foreground-muted bg-clip-text text-[2rem] font-semibold tracking-tight text-transparent">
            {isNaN(numeric) ? value : <AnimatedNumber value={numeric} suffix={suffix} />}
          </h3>
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{title}</p>
          
          {percentage !== undefined && (
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    percentage > 85
                      ? "bg-rose-500"
                      : percentage > 60
                      ? "bg-amber-500"
                      : "bg-indigo-500"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
                />
              </div>
            </div>
          )}

          {trend && (
             <div className="mt-3 flex items-center justify-between text-xs font-medium text-muted-foreground">
               <span className="flex items-center gap-1.5">
                 <span className={`h-1.5 w-1.5 rounded-full ${
                   percentage !== undefined && percentage > 85 ? "bg-rose-400" : "bg-emerald-400"
                 }`} />
                 {trend}
               </span>
               {percentage !== undefined && (
                 <span className="font-mono text-[10px] text-muted-foreground">{percentage}% load</span>
               )}
             </div>
          )}

        </m.div>
      </div>
    </m.div>
  );
}
