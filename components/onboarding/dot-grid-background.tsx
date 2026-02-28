"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useTransform } from "motion/react";

export function DotGridBackground() {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const bgX = useTransform(mouseX, (v) => (960 - v) / 100);
  const bgY = useTransform(mouseY, (v) => (540 - v) / 100);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      mouseX.set(e.clientX);
      mouseY.set(e.clientY);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [mouseX, mouseY]);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      <motion.div
        className="absolute inset-[-20px]"
        style={{
          x: bgX,
          y: bgY,
          opacity: 0.2,
          backgroundImage:
            "radial-gradient(#C4C4C4 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />
    </div>
  );
}
