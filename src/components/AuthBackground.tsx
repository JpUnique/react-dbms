import React from "react";

interface Props {
  /** "theme" respects light/dark mode (used on Login/Register/reset & 2FA screens).
   *  "dark" forces the deep splash palette regardless of theme. */
  variant?: "theme" | "dark";
  /** Number of ambient particles to render. */
  particleCount?: number;
}

// Deterministic particle field — computed once at module load so it never
// reshuffles on re-render, but still reads as organic (varied position/size/timing).
function buildParticles(count: number) {
  return Array.from({ length: count }, (_, i) => {
    const seed = i * 137.508; // golden-angle spread for even, non-grid coverage
    const top = (seed * 3.7) % 100;
    const left = (seed * 5.3) % 100;
    const size = 3 + ((i * 7) % 6);
    const dx = 15 + ((i * 11) % 30);
    const dy = 15 + ((i * 17) % 35);
    const duration = 6 + ((i * 3) % 10);
    const delay = (i * 0.37) % 6;
    const opacity = 0.4 + ((i % 5) * 0.11);
    return { top, left, size, dx, dy, duration, delay, opacity };
  });
}

const AuthBackground: React.FC<Props> = ({ variant = "theme", particleCount = 26 }) => {
  const isDark = variant === "dark";
  const particles = React.useMemo(() => buildParticles(particleCount), [particleCount]);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Base gradient */}
      <div
        className={
          isDark
            ? "absolute inset-0 bg-[#060b14]"
            : "absolute inset-0 bg-linear-to-br from-slate-50 via-blue-50/30 to-indigo-50/40 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950"
        }
      />

      {/* Rotating conic mesh — the "living video" layer */}
      <div
        className="absolute -inset-[20%] opacity-50 dark:opacity-65 blur-2xl"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(59,130,246,0.55), rgba(139,92,246,0.5), rgba(20,184,166,0.42), rgba(59,130,246,0.55))",
          animation: "mesh-rotate 42s linear infinite",
        }}
      />
      <div
        className="absolute -inset-[25%] opacity-35 dark:opacity-45 blur-2xl"
        style={{
          background:
            "conic-gradient(from 90deg, rgba(99,102,241,0.5), rgba(236,72,153,0.3), rgba(59,130,246,0.42), rgba(99,102,241,0.5))",
          animation: "mesh-rotate-reverse 58s linear infinite",
        }}
      />

      {/* Floating orbs */}
      <div
        className={
          isDark
            ? "absolute -top-40 -right-28 h-[420px] w-[420px] rounded-full bg-blue-500/35 blur-3xl"
            : "absolute -top-48 -right-32 h-96 w-96 rounded-full bg-blue-400/35 dark:bg-blue-500/25 blur-3xl"
        }
        style={{ animation: "orb-float-1 9s ease-in-out infinite" }}
      />
      <div
        className={
          isDark
            ? "absolute -bottom-40 -left-28 h-[420px] w-[420px] rounded-full bg-violet-500/32 blur-3xl"
            : "absolute -bottom-48 -left-32 h-96 w-96 rounded-full bg-violet-400/35 dark:bg-violet-500/25 blur-3xl"
        }
        style={{ animation: "orb-float-2 12s ease-in-out infinite" }}
      />
      <div
        className={
          isDark
            ? "absolute top-1/3 left-1/4 h-72 w-72 rounded-full bg-teal-500/24 blur-3xl"
            : "absolute top-1/3 left-1/4 h-64 w-64 rounded-full bg-teal-400/22 dark:bg-teal-500/15 blur-3xl"
        }
        style={{ animation: "orb-float-3 7s ease-in-out infinite" }}
      />

      {/* Ambient particle field */}
      <div className="absolute inset-0">
        {particles.map((p, i) => (
          <span
            key={i}
            className={isDark ? "absolute rounded-full bg-blue-300" : "absolute rounded-full bg-blue-500 dark:bg-blue-300"}
            style={{
              top: `${p.top}%`,
              left: `${p.left}%`,
              width: p.size,
              height: p.size,
              opacity: p.opacity,
              // @ts-expect-error -- custom properties consumed by the particle-drift keyframes
              "--p-dx": `${p.dx}px`,
              "--p-dy": `-${p.dy}px`,
              "--p-opacity": p.opacity,
              animation: `particle-drift ${p.duration}s ease-in-out ${p.delay}s infinite, particle-twinkle ${p.duration * 0.6}s ease-in-out ${p.delay}s infinite`,
            }}
          />
        ))}
      </div>

      {/* Scanning light beam sweep */}
      <div
        className="absolute inset-x-0 h-1/3 opacity-0"
        style={{
          background:
            "linear-gradient(180deg, transparent, rgba(99,102,241,0.22), transparent)",
          animation: "scan-sweep 8s ease-in-out infinite",
        }}
      />

      {/* Dot grid (light mode / dark variant) */}
      <div
        className={isDark ? "absolute inset-0" : "absolute inset-0 dark:hidden"}
        style={{
          backgroundImage: isDark
            ? "linear-gradient(rgba(148,163,184,1) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,1) 1px,transparent 1px)"
            : "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
          backgroundSize: isDark ? "40px 40px" : "28px 28px",
          opacity: isDark ? 0.08 : 0.35,
        }}
      />
      {/* Grid lines (dark mode only, theme variant) */}
      {!isDark && (
        <div
          className="absolute inset-0 hidden dark:block"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.09) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
      )}
    </div>
  );
};

export default AuthBackground;
