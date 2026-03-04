"use client";

import { motion, useReducedMotion } from "motion/react";
import { useState, useEffect, useMemo } from "react";

const CHAR_DELAY_MS = 40;

type Props = {
  userName: string;
};

export function WelcomeSection({ userName }: Props) {
  const welcomeText = useMemo(
    () => `Welcome to your new station, ${userName}.`,
    [userName]
  );
  const shouldReduceMotion = useReducedMotion();
  const [displayedText, setDisplayedText] = useState(
    shouldReduceMotion ? welcomeText : ""
  );
  const [typingDone, setTypingDone] = useState(!!shouldReduceMotion);

  useEffect(() => {
    if (shouldReduceMotion) return;

    let index = 0;
    let interval: ReturnType<typeof setInterval>;
    const timer = setTimeout(() => {
      interval = setInterval(() => {
        index++;
        setDisplayedText(welcomeText.slice(0, index));
        if (index >= welcomeText.length) {
          clearInterval(interval);
          setTypingDone(true);
        }
      }, CHAR_DELAY_MS);
    }, 500);

    return () => {
      clearTimeout(timer);
      clearInterval(interval);
      setDisplayedText("");
      setTypingDone(false);
    };
  }, [shouldReduceMotion, welcomeText]);

  return (
    <div className="flex flex-col" style={{ gap: 12 }}>
      <div
        style={{
          fontSize: 28,
          fontWeight: 500,
          letterSpacing: "-0.02em",
          lineHeight: 1.2,
          color: "#1A1A1A",
        }}
      >
        {displayedText}
        <span
          className="inline-block align-middle"
          style={{
            width: 2,
            height: 18,
            background: "#1A1A1A",
            marginLeft: 2,
            animation: "blink 1s step-end infinite",
          }}
        />
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={typingDone ? { opacity: 1 } : {}}
        transition={{ duration: 0.5 }}
        style={{
          fontSize: 15,
          color: "#8F8F8F",
          lineHeight: 1.5,
        }}
      >
        Call Stack OS is a spatial environment designed for deep thought.
        Let&apos;s set up your first space to get started.
      </motion.div>
    </div>
  );
}
