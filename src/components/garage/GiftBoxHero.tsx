"use client";

/**
 * GiftBoxHero — Animated SVG illustration.
 * Open gift box + floating car-related items.
 * Dark brown box + orange accent — matching brand colors.
 */

export function GiftBoxHero() {
  return (
    <svg
      viewBox="0 0 220 210"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-auto w-full"
      aria-hidden="true"
    >
      <style>{`
        @keyframes float1 { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-8px) rotate(5deg)} }
        @keyframes float2 { 0%,100%{transform:translateY(0) rotate(8deg)} 50%{transform:translateY(-10px) rotate(-4deg)} }
        @keyframes float3 { 0%,100%{transform:translateY(0) rotate(-10deg)} 50%{transform:translateY(-6px) rotate(10deg)} }
        @keyframes float4 { 0%,100%{transform:translateY(0) rotate(4deg)} 50%{transform:translateY(-12px) rotate(-6deg)} }
        @keyframes bounce { 0%,100%{transform:translateY(0) rotate(-5deg)} 50%{transform:translateY(-5px) rotate(-5deg)} }
        @keyframes lidBob  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-4px)} }
        .f1 { animation: float1 3.2s ease-in-out infinite; transform-origin: center; }
        .f2 { animation: float2 2.8s ease-in-out infinite 0.4s; transform-origin: center; }
        .f3 { animation: float3 3.6s ease-in-out infinite 0.8s; transform-origin: center; }
        .f4 { animation: float4 3s ease-in-out infinite 1.2s; transform-origin: center; }
        .box { animation: bounce 2.4s ease-in-out infinite; transform-origin: 110px 180px; }
        .lid { animation: lidBob 2.4s ease-in-out infinite; transform-origin: 110px 85px; }
      `}</style>

      {/* ── Floating items (closer to center) ─────────────────────────────── */}

      {/* Wrench — top right */}
      <g className="f1" style={{ transformOrigin: "172px 38px" }}>
        <rect
          x="166"
          y="22"
          width="6"
          height="18"
          rx="2"
          fill="#3B2006"
          transform="rotate(-30 172 38)"
        />
        <circle
          cx="170"
          cy="24"
          r="4"
          fill="none"
          stroke="#3B2006"
          strokeWidth="2.5"
        />
        <circle
          cx="174"
          cy="49"
          r="4"
          fill="none"
          stroke="#3B2006"
          strokeWidth="2.5"
        />
      </g>

      {/* Oil drop — top left */}
      <g className="f2" style={{ transformOrigin: "40px 32px" }}>
        <path
          d="M40 19 C40 19 32 28 32 33 A8 8 0 0 0 48 33 C48 28 40 19 40 19Z"
          fill="#F97316"
          opacity="0.9"
        />
        <ellipse cx="40" cy="31" rx="3" ry="2" fill="white" opacity="0.4" />
      </g>

      {/* Car wheel — top center-right */}
      <g className="f3" style={{ transformOrigin: "150px 26px" }}>
        <circle cx="150" cy="26" r="10" fill="#3B2006" />
        <circle cx="150" cy="26" r="6" fill="#555" />
        <circle cx="150" cy="26" r="3" fill="#999" />
        <line
          x1="150"
          y1="18"
          x2="150"
          y2="34"
          stroke="#777"
          strokeWidth="1.2"
        />
        <line
          x1="142"
          y1="26"
          x2="158"
          y2="26"
          stroke="#777"
          strokeWidth="1.2"
        />
        <line
          x1="144.4"
          y1="20.4"
          x2="155.6"
          y2="31.6"
          stroke="#777"
          strokeWidth="1.2"
        />
        <line
          x1="144.4"
          y1="31.6"
          x2="155.6"
          y2="20.4"
          stroke="#777"
          strokeWidth="1.2"
        />
      </g>

      {/* Spark plug — left */}
      <g className="f4" style={{ transformOrigin: "22px 82px" }}>
        <rect x="18" y="70" width="8" height="14" rx="2" fill="#3B2006" />
        <rect x="19" y="84" width="6" height="10" rx="1" fill="#888" />
        <line
          x1="22"
          y1="94"
          x2="22"
          y2="100"
          stroke="#F97316"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>

      {/* Bolt — right side */}
      <g className="f1" style={{ transformOrigin: "196px 90px" }}>
        <polygon
          points="196,80 203,84 203,96 196,100 189,96 189,84"
          fill="#3B2006"
          opacity="0.85"
        />
        <circle cx="196" cy="90" r="4" fill="#888" />
        <circle cx="196" cy="90" r="2" fill="#ccc" />
      </g>

      {/* ── Gift box body (bouncing + tilted) ───────────────────────────────── */}
      <g className="box" style={{ transformOrigin: "110px 180px" }}>
        {/* Shadow */}
        <ellipse cx="110" cy="182" rx="50" ry="6" fill="#00000020" />

        {/* Box body */}
        <rect x="60" y="122" width="100" height="56" rx="4" fill="#3B2006" />

        {/* Interior peek at open top */}
        <rect x="61" y="122" width="98" height="11" rx="3" fill="#5C3010" />

        {/* Ribbon vertical */}
        <rect x="102" y="122" width="16" height="56" rx="2" fill="#F97316" />
        {/* Ribbon horizontal */}
        <rect x="60" y="142" width="100" height="10" rx="2" fill="#F97316" />
      </g>

      {/* ── Lid — open, floating above box ──────────────────────────────────── */}
      <g className="lid" style={{ transformOrigin: "110px 85px" }}>
        {/* Shift up + tilt backward so it looks open */}
        <g transform="translate(0 -24) rotate(-12 110 120)">
          <rect x="55" y="108" width="110" height="20" rx="5" fill="#4E2A08" />
          {/* Left bow loop */}
          <ellipse
            cx="95"
            cy="108"
            rx="15"
            ry="9"
            fill="#F97316"
            transform="rotate(-20 95 108)"
          />
          {/* Right bow loop */}
          <ellipse
            cx="125"
            cy="108"
            rx="15"
            ry="9"
            fill="#F97316"
            transform="rotate(20 125 108)"
          />
          {/* Center knot */}
          <circle cx="110" cy="108" r="7" fill="#EA580C" />
        </g>
      </g>
    </svg>
  );
}
