import React, { useEffect, useState } from "react";
import VideoBackground from "./VideoBackground";

interface Props {
  onDone: () => void;
}

const SPLASH_DURATION_MS = 15000;
const FADE_DURATION_MS = 600;

const STATUS_STEPS = [
  "Initializing workspace…",
  "Securing connection…",
  "Loading document vault…",
  "Preparing your documents…",
  "Almost ready…",
];

const SplashScreen: React.FC<Props> = ({ onDone }) => {
  const [fading, setFading] = useState(false);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    const fadeTimer = setTimeout(
      () => setFading(true),
      SPLASH_DURATION_MS - FADE_DURATION_MS,
    );
    const doneTimer = setTimeout(() => onDone(), SPLASH_DURATION_MS);
    const statusInterval = setInterval(
      () => setStatusIndex((i) => (i + 1) % STATUS_STEPS.length),
      SPLASH_DURATION_MS / STATUS_STEPS.length,
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
        transition: `opacity ${FADE_DURATION_MS}ms ease-out`,
        opacity: fading ? 0 : 1,
        pointerEvents: fading ? "none" : "all",
      }}
    >
      {/* Nested here (not just relying on the app-root instance) so this
          fixed z-9999 layer is fully opaque on its own and hides the page
          mounted underneath for the whole splash duration. */}
      <VideoBackground />

      {/* Center content */}
      <div className="relative z-10 flex flex-col items-center gap-6">
        {/* Logo — plain mark, no surrounding box */}
        <img
          src="/assets/images/logo.png"
          alt="PetroData"
          className="h-44 w-44 object-contain drop-shadow-[0_0_50px_rgba(99,102,241,0.55)]"
          style={{
            animation:
              "splash-logo-in 0.85s cubic-bezier(0.34,1.4,0.64,1) 0.1s both",
          }}
          onError={(e) => {
            e.currentTarget.style.display = "none";
          }}
        />

        {/* Title */}
        <div
          className="text-center"
          style={{ animation: "splash-text-in 0.5s ease-out 0.7s both" }}
        >
          <h1 className="text-6xl font-bold tracking-tight text-white">
            PetroData
          </h1>
          <p className="mt-2 text-lg font-medium text-slate-300 tracking-wide uppercase">
            Document Management Service
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
