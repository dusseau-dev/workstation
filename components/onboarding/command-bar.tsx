"use client";

import { motion } from "motion/react";

export function CommandBar({ delay = 2.3 }: { delay?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      className="fixed left-1/2 z-[100] flex w-full -translate-x-1/2 justify-center"
      style={{ bottom: 32 }}
    >
      <div
        className="flex items-center"
        style={{
          width: 460,
          gap: 8,
          padding: 8,
          background: "#FFFFFF",
          borderRadius: 12,
          boxShadow:
            "0 8px 16px rgba(0,0,0,0.04), 0 0 0 1px #DEDEDE",
        }}
      >
        <input
          type="text"
          placeholder="Try 'Create a project for my new product launch'..."
          className="min-w-0 flex-1 border-none outline-none"
          style={{
            padding: "8px 12px",
            fontSize: 14,
            color: "#1A1A1A",
            background: "transparent",
            fontFamily: "inherit",
          }}
        />
        <span
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#8F8F8F",
            background: "#EBEBEB",
            padding: "4px 8px",
            borderRadius: 6,
          }}
        >
          Enter
        </span>
      </div>
    </motion.div>
  );
}
