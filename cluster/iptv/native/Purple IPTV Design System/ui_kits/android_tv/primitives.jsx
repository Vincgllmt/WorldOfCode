// Primitives: focus management, buttons, chips.
const { useState, useEffect, useRef, useCallback, useMemo } = React;

/* ============================================================
   useDpad: a single-source-of-truth keyboard handler. Each screen
   calls it with a 2-D grid of cells (rows × cols) and the
   currently-focused cell ([r, c]). It updates that state on
   arrow keys and triggers `onEnter` when the user presses Enter.
   ============================================================ */
function useDpad({ rows, getCols, pos, setPos, onEnter, onBack, enabled = true }) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e) => {
      // Skip if global zone says rail owns input
      if (window.__purpleZone === "rail") return;
      const [r, c] = pos;
      const cols = getCols(r);
      if (e.key === "ArrowRight") {
        if (c < cols - 1) { setPos([r, c + 1]); e.preventDefault(); }
      } else if (e.key === "ArrowLeft") {
        if (c > 0) { setPos([r, c - 1]); e.preventDefault(); }
      } else if (e.key === "ArrowDown") {
        if (r < rows - 1) {
          const nextCols = getCols(r + 1);
          setPos([r + 1, Math.min(c, nextCols - 1)]); e.preventDefault();
        }
      } else if (e.key === "ArrowUp") {
        if (r > 0) {
          const prevCols = getCols(r - 1);
          setPos([r - 1, Math.min(c, prevCols - 1)]); e.preventDefault();
        }
      } else if (e.key === "Enter" || e.key === " ") {
        onEnter && onEnter(r, c);
        e.preventDefault();
      } else if (e.key === "Escape" || e.key === "Backspace") {
        onBack && onBack();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [pos, rows, getCols, onEnter, onBack, enabled]);
}

/* ============================================================
   Focus visual primitive.
   `focused` controls a "scale + ring + glow" treatment.
   ============================================================ */
function FocusRing({ focused, radius = 14, intensity = 1, children, style }) {
  return (
    <div
      className="focusable"
      style={{
        position: "relative",
        borderRadius: radius,
        transform: focused ? `scale(${1 + 0.06 * intensity})` : "scale(1)",
        boxShadow: focused
          ? `0 0 0 3px var(--purple-400), 0 0 ${24 * intensity}px rgba(179,107,252,${0.55 * intensity}), 0 0 ${64 * intensity}px rgba(168,85,247,${0.32 * intensity})`
          : "none",
        zIndex: focused ? 10 : 1,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/* Bottom protection gradient + title for posters/banner artwork */
function ProtectionGradient({ from = "rgba(11,4,20,0)", to = "rgba(11,4,20,0.9)", height = "60%", ...props }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 0, right: 0, bottom: 0,
        height,
        background: `linear-gradient(180deg, ${from} 0%, ${to} 100%)`,
        pointerEvents: "none",
        ...props.style,
      }}
    />
  );
}

/* ============================================================
   CTA Button — supports primary / secondary / ghost.
   Visual focus state is driven by the `focused` prop, not :focus,
   because the host owns focus tracking.
   ============================================================ */
function Button({ variant = "primary", focused, icon, children, style }) {
  const baseStyles = {
    primary:   { background: "var(--purple-400)", color: "#fff", border: "none" },
    secondary: { background: "transparent",       color: "var(--purple-300)", border: "1.5px solid var(--purple-400)" },
    ghost:     { background: "rgba(255,255,255,0.05)", color: "#fff", border: "1px solid rgba(255,255,255,0.08)" },
  }[variant];

  return (
    <FocusRing focused={focused} radius={14} intensity={focused ? 1 : 0}>
      <div
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 14,
          padding: "18px 30px", borderRadius: 14,
          font: "600 22px/1 var(--font-display)", letterSpacing: 0.2,
          minWidth: 200, height: 64, cursor: "pointer",
          transition: "background-color 160ms ease-out",
          ...baseStyles,
          ...(focused && variant === "secondary" ? { background: "rgba(179,107,252,0.18)", color: "#fff" } : null),
          ...style,
        }}
      >
        {icon}
        {children}
      </div>
    </FocusRing>
  );
}

function PillButton({ children, focused, variant = "outline", icon, style }) {
  const outline = variant === "outline";
  return (
    <FocusRing focused={focused} radius={999}>
      <div style={{
        display: "inline-flex", alignItems: "center", gap: 10,
        padding: "12px 26px", borderRadius: 999,
        border: outline ? "1.5px solid #fff" : "none",
        background: outline ? "transparent" : "var(--purple-400)",
        color: "#fff",
        font: "700 14px/1 var(--font-display)", letterSpacing: 0.12, textTransform: "uppercase",
        ...style,
      }}>
        {icon}
        {children}
      </div>
    </FocusRing>
  );
}

function MetaChip({ children, accent = false }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "8px 14px", borderRadius: 10,
      background: accent ? "rgba(179,107,252,0.16)" : "rgba(255,255,255,0.06)",
      border: accent ? "1px solid rgba(179,107,252,0.45)" : "1px solid rgba(255,255,255,0.06)",
      color: "var(--fg-1)", font: "500 18px/1 var(--font-display)",
    }}>
      {children}
    </span>
  );
}

function RatingChip({ value }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 6,
      padding: "6px 10px", borderRadius: 8,
      background: "var(--purple-400)", color: "#fff",
      font: "600 14px/1 var(--font-display)",
    }}>
      <Icons.Star size={14} />
      {value}
    </span>
  );
}

function CapsLabel({ children, color = "var(--purple-300)", size = 14 }) {
  return (
    <div style={{
      font: `600 ${size}px var(--font-display)`,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color,
    }}>
      {children}
    </div>
  );
}

function LiveBadge() {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 8,
      padding: "6px 12px", borderRadius: 8,
      background: "var(--purple-400)", color: "#fff",
      font: "800 14px/1 var(--font-display)", letterSpacing: 0.06,
    }}>
      EN DIRECT
    </span>
  );
}

function LiveDot() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#FF3B30", font: "800 14px/1 var(--font-display)", letterSpacing: 0.08 }}>
      <span className="live-dot" style={{ width: 10, height: 10, borderRadius: 999, background: "#FF3B30", display: "inline-block" }} />
      LIVE
    </span>
  );
}

window.useDpad = useDpad;
window.FocusRing = FocusRing;
window.ProtectionGradient = ProtectionGradient;
window.Button = Button;
window.PillButton = PillButton;
window.MetaChip = MetaChip;
window.RatingChip = RatingChip;
window.CapsLabel = CapsLabel;
window.LiveBadge = LiveBadge;
window.LiveDot = LiveDot;
