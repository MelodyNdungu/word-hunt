"use client";

import { useEffect, useState } from "react";

interface Props {
  duration: number; // seconds
  startTime: number; // Date.now() ms
  onExpire: () => void;
}

export default function Timer({ duration, startTime, onExpire }: Props) {
  const [remaining, setRemaining] = useState(duration);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const tick = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const left = Math.max(0, duration - elapsed);
      setRemaining(left);
      if (left <= 0 && !expired) {
        setExpired(true);
        onExpire();
      }
    };
    tick();
    const id = setInterval(tick, 200);
    return () => clearInterval(id);
  }, [duration, startTime, onExpire, expired]);

  const pct = remaining / duration;
  const mins = Math.floor(remaining / 60);
  const secs = Math.floor(remaining % 60);
  const display = `${mins}:${secs.toString().padStart(2, "0")}`;

  const color =
    pct > 0.5 ? "text-green-400" : pct > 0.25 ? "text-yellow-400" : "text-red-400";
  const ringColor =
    pct > 0.5 ? "stroke-green-400" : pct > 0.25 ? "stroke-yellow-400" : "stroke-red-400";

  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - pct);

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="absolute" width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={`${ringColor} transition-all duration-200`}
          transform="rotate(-90 40 40)"
        />
      </svg>
      <span className={`text-xl font-bold ${color} relative z-10`}>{display}</span>
    </div>
  );
}
