import React, { useState, useEffect, useRef, useCallback } from "react";
import { m, useReducedMotion } from "framer-motion";
import { Cpu, MemoryStick, HardDrive, Zap, CheckCircle2 } from "lucide-react";
import { SystemStats } from "../../types/dashboard";

interface ResourcesSliderProps {
  stats: SystemStats | null;
}

export function ResourcesSlider({ stats }: ResourcesSliderProps) {
  const reduce = useReducedMotion();
  const [currentIndex, setCurrentIndex] = useState(0);

  const cpuVal = stats ? stats.cpuUsage : 18;
  const ramVal = stats ? stats.ramUsage : 42;
  const diskVal = stats && stats.diskUsage !== undefined ? stats.diskUsage : 28;

  // Resource metrics excluding server counts as requested
  const resources = [
    {
      id: "cpu",
      title: "CPU Utilization",
      value: `${cpuVal}%`,
      percentage: cpuVal,
      status: "Host Processor Load",
      details: "8 Active Compute Cores",
      icon: <Cpu className="h-6 w-6 text-zinc-200" />,
      badge: "Compute Engine",
      borderColor: "border-sky-500/40",
      accentBg: "bg-sky-500/10 text-sky-300",
      progressColor: "bg-zinc-200",
    },
    {
      id: "memory",
      title: "Memory Usage",
      value: `${ramVal}%`,
      percentage: ramVal,
      status: "RAM Allocation",
      details: "High Performance DDR5",
      icon: <MemoryStick className="h-6 w-6 text-theme-700" />,
      badge: "Memory",
      borderColor: "border-fuchsia-500/40",
      accentBg: "bg-fuchsia-500/10 text-fuchsia-300",
      progressColor: "bg-theme-700",
    },
    {
      id: "disk",
      title: "Storage Usage",
      value: `${diskVal}%`,
      percentage: diskVal,
      status: "NVMe Disk Space",
      details: "Ultra Fast Storage Array",
      icon: <HardDrive className="h-6 w-6 text-theme-500" />,
      badge: "Storage",
      borderColor: "border-theme-600/40",
      accentBg: "bg-theme-600/10 text-theme-400",
      progressColor: "bg-theme-500",
    },
  ];

  const total = resources.length;

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % total);
  }, [total]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + total) % total);
  }, [total]);

  // Auto-slide every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      nextSlide();
    }, 5000);
    return () => clearInterval(interval);
  }, [nextSlide]);

  // Handle Drag & Swipe gestures (for mouse & mobile)
  const handleDragEnd = (_: any, info: { offset: { x: number }; velocity: { x: number } }) => {
    const swipeThreshold = 40;
    if (info.offset.x < -swipeThreshold || info.velocity.x < -200) {
      nextSlide();
    } else if (info.offset.x > swipeThreshold || info.velocity.x > 200) {
      prevSlide();
    }
  };

  // Horizontal wheel scroll support
  const handleWheel = (e: React.WheelEvent) => {
    if (Math.abs(e.deltaX) > 30) {
      if (e.deltaX > 0) nextSlide();
      else prevSlide();
    }
  };

  return (
    <div
      onWheel={handleWheel}
      className="relative flex flex-col gap-3 bg-transparent p-0 transition-all select-none"
    >
      {/* Top Header: Dot indicators only */}
      <div className="flex items-center justify-end pb-1">
        {/* Minimal dot navigation */}
        <div className="flex items-center gap-1.5">
          {resources.map((item, idx) => {
            const isActive = idx === currentIndex;
            return (
              <button
                key={item.id}
                onClick={() => setCurrentIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  isActive ? "w-5 bg-theme-600" : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                }`}
                title={item.title}
              />
            );
          })}
        </div>
      </div>

      {/* 5-second progress bar */}
      <div className="h-0.5 w-full bg-muted/40 rounded-full overflow-hidden relative">
        <m.div
          key={currentIndex}
          initial={{ width: "0%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 5, ease: "linear" }}
          className="h-full bg-gradient-to-r from-zinc-200 via-theme-500 to-theme-700 rounded-full"
        />
      </div>

      {/* Touch/Mouse Draggable 3D Peek Carousel */}
      <div className="relative h-[160px] w-full overflow-hidden flex items-center justify-center py-1">
        {resources.map((item, index) => {
          const diff = (index - currentIndex + total) % total;

          const isCenter = diff === 0;
          const isRight = diff === 1;
          const isLeft = diff === total - 1;

          let positionX = "0%";
          let opacity = 0;
          let scale = 0.75;
          let zIndex = 0;

          if (isCenter) {
            positionX = "0%";
            opacity = 1;
            scale = 1;
            zIndex = 30;
          } else if (isRight) {
            positionX = "68%";
            opacity = 0.45;
            scale = 0.82;
            zIndex = 20;
          } else if (isLeft) {
            positionX = "-68%";
            opacity = 0.45;
            scale = 0.82;
            zIndex = 20;
          } else {
            positionX = "130%";
            opacity = 0;
            scale = 0.7;
            zIndex = 10;
          }

          return (
            <m.div
              key={item.id}
              onClick={() => setCurrentIndex(index)}
              drag={isCenter ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.2}
              onDragEnd={handleDragEnd}
              initial={false}
              animate={{
                x: positionX,
                scale,
                opacity,
                zIndex,
                filter: isCenter ? "blur(0px)" : "blur(2px)",
              }}
              transition={
                reduce
                  ? { duration: 0.2 }
                  : {
                      x: { type: "spring", stiffness: 320, damping: 30 },
                      scale: { duration: 0.3 },
                      opacity: { duration: 0.3 },
                      filter: { duration: 0.3 },
                    }
              }
              className={`absolute top-0 w-[88%] sm:w-[72%] max-w-lg cursor-grab active:cursor-grabbing rounded-2xl border qx-glass ${
                isCenter ? `${item.borderColor} shadow-lg shadow-theme-600/5` : "border-border/40 hover:opacity-75"
              } p-4 transition-colors`}
            >
              <div className="flex items-start justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/60 ${item.accentBg} shadow-inner`}>
                    {item.icon}
                  </div>
                  <div>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${item.accentBg}`}>
                      {item.badge}
                    </span>
                    <h4 className="text-sm font-extrabold text-foreground mt-0.5 tracking-tight">
                      {item.title}
                    </h4>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-2xl font-black font-mono text-foreground tracking-tight">
                    {item.value}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="mt-2.5">
                <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground mb-1">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 size={12} className="text-theme-500" />
                    {item.status}
                  </span>
                  <span className="font-mono text-[11px] font-semibold">{item.percentage}%</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-muted/80 overflow-hidden p-0.5 border border-border-subtle">
                  <m.div
                    initial={{ width: 0 }}
                    animate={{ width: `${item.percentage}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className={`h-full rounded-full ${item.progressColor}`}
                  />
                </div>
              </div>

              <div className="mt-2 text-[10px] font-medium text-muted-foreground flex items-center justify-between">
                <span>{item.details}</span>
                <span className="text-[9px] uppercase tracking-wider text-muted-foreground/60">
                  Swipe / Drag to slide
                </span>
              </div>
            </m.div>
          );
        })}
      </div>
    </div>
  );
}
