// Chrome: SideRail (left nav) + TopChrome (brand + global actions)

const RAIL_ITEMS = [
  { id: "home",     label: "Home",      icon: Icons.Home },
  { id: "search",   label: "Search",    icon: Icons.Search },
  { id: "directtv", label: "Direct TV", icon: Icons.Tv },
  { id: "films",    label: "Films",     icon: Icons.Film },
  { id: "series",   label: "Series",    icon: Icons.Series },
  { id: "downloads",label: "Downloads", icon: Icons.Download },
];

const RAIL_FOOTER = [
  { id: "settings", label: "Settings",  icon: Icons.Settings },
];

function SideRail({ active, expanded, focusedIdx }) {
  // expanded: true when focus is in the rail; auto-shrinks otherwise
  const W = expanded ? 320 : 110;

  const item = (it, idx, isFooter = false) => {
    const isActive = it.id === active;
    const isFocused = expanded && focusedIdx === (isFooter ? RAIL_ITEMS.length : idx);
    const bg = isFocused ? "var(--purple-400)" : (isActive && !expanded ? "rgba(179,107,252,0.18)" : "transparent");
    const color = isFocused ? "#fff" : (isActive ? "var(--purple-300)" : "rgba(255,255,255,0.55)");
    return (
      <div key={it.id} className="focusable" style={{
        display: "flex", alignItems: "center", gap: 22,
        padding: expanded ? "18px 22px" : "18px 0",
        margin: expanded ? "4px 14px" : "4px 0",
        borderRadius: 14,
        background: bg, color,
        justifyContent: expanded ? "flex-start" : "center",
        boxShadow: isFocused ? "0 0 24px rgba(179,107,252,0.45)" : "none",
        transform: isFocused ? "scale(1.02)" : "scale(1)",
      }}>
        <it.icon size={28} stroke={color} sw={1.8} />
        {expanded && (
          <span style={{ font: "600 22px/1 var(--font-display)", letterSpacing: 0.2, whiteSpace: "nowrap" }}>
            {it.label}
          </span>
        )}
        {/* Active indicator dot when collapsed */}
        {!expanded && isActive && (
          <span style={{
            position: "absolute", left: 6, top: "50%", marginTop: -10, width: 4, height: 20, borderRadius: 4,
            background: "var(--purple-400)",
          }} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      width: W,
      height: "100%",
      background: expanded ? "linear-gradient(90deg, rgba(11,4,20,0.95) 0%, rgba(11,4,20,0.85) 60%, rgba(11,4,20,0) 100%)" : "transparent",
      backdropFilter: expanded ? "blur(20px)" : "none",
      WebkitBackdropFilter: expanded ? "blur(20px)" : "none",
      display: "flex", flexDirection: "column",
      transition: "width 220ms cubic-bezier(0.22, 1, 0.36, 1), background 220ms",
      position: "absolute", left: 0, top: 0, bottom: 0, zIndex: 30,
      padding: "44px 0 32px",
      boxSizing: "border-box",
    }}>
      {/* Brand mark */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        padding: expanded ? "0 26px 28px" : "0 0 28px",
        justifyContent: expanded ? "flex-start" : "center",
        borderBottom: expanded ? "1px solid rgba(255,255,255,0.06)" : "none",
        marginBottom: 10,
      }}>
        <img src="../../assets/logo_mark_tight.png" alt="" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: 8 }} />
        {expanded && (
          <span style={{ font: "800 22px/1 var(--font-display)", letterSpacing: 0.02 }}>
            <span style={{ color: "var(--purple-400)" }}>PURPLE</span>{" "}
            <span style={{ color: "#fff", fontWeight: 400 }}>IPTV</span>
          </span>
        )}
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 0 }}>
        {RAIL_ITEMS.map((it, i) => item(it, i))}
      </div>
      <div>
        {RAIL_FOOTER.map((it, i) => item(it, i, true))}
      </div>

      {/* Trial pill at bottom when expanded */}
      {expanded && (
        <div style={{
          margin: "16px 18px 0",
          padding: "14px 16px",
          borderRadius: 14,
          background: "rgba(179,107,252,0.12)",
          border: "1px solid rgba(179,107,252,0.35)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ color: "var(--purple-300)" }}><Icons.Timer size={18} /></span>
          <span style={{ color: "#fff", font: "500 14px/1.4 var(--font-display)" }}>
            Trial: <strong style={{ color: "var(--purple-300)" }}>3 day(s)</strong>
          </span>
        </div>
      )}
    </div>
  );
}

function TopChrome({ user = "TRIAL", time = "18:00" }) {
  return (
    <div style={{
      position: "absolute", top: 0, left: 0, right: 0, height: 72,
      display: "flex", alignItems: "center", justifyContent: "flex-end",
      padding: "0 96px",
      zIndex: 25,
      pointerEvents: "none",
    }}>
      <div style={{
        display: "flex", alignItems: "center", gap: 28,
        color: "rgba(255,255,255,0.7)",
        font: "500 18px/1 var(--font-display)",
      }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "var(--purple-300)" }}>
          <Icons.Timer size={18} /> Trial · 3 days
        </span>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
        <span>{time}</span>
        <span style={{ width: 1, height: 18, background: "rgba(255,255,255,0.15)" }} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <Icons.User size={18} /> {user}
        </span>
      </div>
    </div>
  );
}

window.SideRail = SideRail;
window.TopChrome = TopChrome;
window.RAIL_ITEMS = RAIL_ITEMS;
window.RAIL_FOOTER = RAIL_FOOTER;
