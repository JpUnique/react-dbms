import React, { useEffect, useState } from "react";
import AuthBackground from "./AuthBackground";

interface Props {
  onDone: () => void;
}

const STATUS_STEPS = [
  "Initializing workspace…",
  "Securing connection…",
  "Loading document vault…",
  "Almost ready…",
];

const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [fading, setFading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const fadeTimer = setTimeout(() => setFading(true), 2300);
    const doneTimer = setTimeout(() => onDone(), 2900);
    const statusInterval = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUS_STEPS.length),
      650,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
      clearInterval(statusInterval);
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-9999 flex items-center justify-center overflow-hidden"
      style={{
        transition: "opacity 0.6s ease-out",
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "all",
      }}
    >
      <AuthBackground variant="dark" particleCount={34} />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-5">
        {/* Logo icon with orbiting pulse rings */}
        <div className="relative flex items-center justify-center">
          <div
            className="absolute h-32 w-32 rounded-[28px] border border-blue-400/40"
            style={{ animation: "pulse-ring 2.4s ease-out 0.4s infinite" }}
          />
          <div
            className="absolute h-32 w-32 rounded-[28px] border border-violet-400/30"
            style={{ animation: "pulse-ring 2.4s ease-out 1.2s infinite" }}
          />
          <div
            className="h-32 w-32 rounded-[28px] flex items-center justify-center shadow-2xl"
            style={{
              background:
                "linear-gradient(135deg, #3b82f6 0%, #6366f1 60%, #8b5cf6 100%)",
              boxShadow:
                "0 0 60px rgba(99,102,241,0.45), 0 0 120px rgba(59,130,246,0.2)",
              animation:
                "splash-logo-in 0.85s cubic-bezier(0.34,1.4,0.64,1) 0.1s both",
            }}
          >
            <img
              src="/assets/images/logo.png"
              alt="PetroData"
              className="h-24 w-24 object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          </div>
        </div>

        {/* Title */}
        <div
          className="text-center"
          style={{ animation: "splash-text-in 0.5s ease-out 0.7s both" }}
        >
          <h1 className="text-4xl font-bold tracking-tight text-white">
            PetroData
          </h1>
          <p className="mt-1.5 text-sm font-medium text-slate-400 tracking-wide uppercase">
            Document Management System
          </p>
        </div>

        {/* Progress bar with shimmer */}
        <div
          className="mt-4 h-0.5 w-56 rounded-full bg-slate-800 overflow-hidden relative"
          style={{ animation: "splash-text-in 0.4s ease-out 1s both" }}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500 relative overflow-hidden"
            style={{ animation: "splash-bar 1.9s ease-in-out 1s both" }}
          >
            <div
              className="absolute inset-y-0 w-1/3 bg-white/40 blur-[2px]"
              style={{ animation: "shimmer-sweep 1.4s ease-in-out infinite" }}
            />
          </div>
        </div>

        {/* Cycling status text */}
        <div className="h-4 relative w-56 text-center">
          <p
            key={statusIndex}
            className="absolute inset-0 text-xs font-medium text-slate-500 tracking-wide"
            style={{ animation: "status-cycle-in 0.65s ease-in-out both" }}
          >
            {STATUS_STEPS[statusIndex]}
          </p>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
