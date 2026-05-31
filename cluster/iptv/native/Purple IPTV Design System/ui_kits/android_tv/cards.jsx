// Card components: posters, series, channels, continue-watching.

function PosterCard({ item, focused, width = 220, height = 320, showLabel = true }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, width }}>
      <FocusRing focused={focused} radius={18}>
        <div style={{
          width, height,
          borderRadius: 18,
          background: item.art,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.55), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          <ProtectionGradient height="50%" to="rgba(11,4,20,0.85)" />
          {/* fake poster typography */}
          <div style={{
            position: "absolute", left: 16, right: 16, top: 18,
            color: "rgba(255,255,255,0.78)",
            font: "400 11px var(--font-display)", letterSpacing: 0.12, textTransform: "uppercase",
          }}>
            {item.year || ""}
          </div>
          <div style={{
            position: "absolute", left: 16, right: 16, bottom: 56,
            color: "#fff",
            font: "800 22px/1.1 var(--font-display)", letterSpacing: -0.01,
            textShadow: "0 2px 10px rgba(0,0,0,0.5)",
            whiteSpace: "pre-line",
          }}>
            {item.logo || item.title}
          </div>
          {item.rating > 0 && (
            <div style={{ position: "absolute", left: 10, bottom: 12 }}>
              <RatingChip value={item.rating} />
            </div>
          )}
        </div>
      </FocusRing>
      {showLabel && (
        <div style={{
          color: focused ? "#fff" : "rgba(255,255,255,0.75)",
          font: "500 17px/1.25 var(--font-display)",
          transition: "color 160ms",
        }}>
          {item.title}
        </div>
      )}
    </div>
  );
}

function ContinueCard({ item, focused, width = 380, height = 215 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width }}>
      <FocusRing focused={focused} radius={16}>
        <div style={{
          width, height,
          borderRadius: 16,
          background: item.art,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5)",
        }}>
          <ProtectionGradient height="55%" to="rgba(11,4,20,0.92)" />
          <div style={{
            position: "absolute", left: 20, right: 20, top: 18,
            color: "rgba(255,255,255,0.7)",
            font: "600 11px var(--font-display)", letterSpacing: 0.14, textTransform: "uppercase",
          }}>
            {item.kind === "series" ? `S${item.season || 1} · ${item.episode || "Continue"}` : "Continue watching"}
          </div>
          <div style={{
            position: "absolute", left: 20, right: 20, bottom: 42,
            color: "#fff",
            font: "700 24px/1.1 var(--font-display)",
            whiteSpace: "pre-line",
          }}>
            {item.logo || item.title}
          </div>
          {/* progress bar */}
          <div style={{
            position: "absolute", left: 20, right: 20, bottom: 22, height: 4,
            background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden",
          }}>
            <div style={{ width: `${(item.progress || 0) * 100}%`, height: "100%", background: "var(--purple-400)", borderRadius: 999 }} />
          </div>
          {/* play affordance on focus */}
          {focused && (
            <div style={{
              position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
              background: "rgba(20,8,42,0.35)",
            }}>
              <div style={{
                width: 88, height: 88, borderRadius: 999,
                background: "var(--purple-400)",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 12px 24px rgba(179,107,252,0.4)",
                color: "#fff",
              }}>
                <Icons.Play size={36} />
              </div>
            </div>
          )}
        </div>
      </FocusRing>
    </div>
  );
}

function ChannelTile({ channel, focused, size = 240 }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, width: size }}>
      <FocusRing focused={focused} radius={16}>
        <div style={{
          width: size, height: size,
          borderRadius: 16,
          background: channel.art,
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 12px 32px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.04)",
        }}>
          {channel.overlay && (
            <div style={{
              position: "absolute", inset: 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff",
              font: "800 28px/1 var(--font-display)", letterSpacing: 0.04,
              textShadow: "0 2px 12px rgba(0,0,0,0.7)",
            }}>
              {channel.overlay}
            </div>
          )}
          {/* faint LIVE indicator */}
          <div style={{ position: "absolute", left: 12, top: 12 }}>
            <span className="live-dot" style={{ width: 8, height: 8, borderRadius: 999, background: "#FF3B30", display: "inline-block" }} />
          </div>
        </div>
      </FocusRing>
      <div style={{
        color: focused ? "#fff" : "rgba(255,255,255,0.72)",
        font: "500 17px/1.3 var(--font-display)",
        transition: "color 160ms",
      }}>
        {channel.name}
      </div>
    </div>
  );
}

function GenreRow({ genre, focused }) {
  return (
    <FocusRing focused={focused} radius={14}>
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "20px 28px", borderRadius: 14,
        background: focused ? "var(--bg-3)" : "transparent",
        boxShadow: focused ? "inset 4px 0 0 var(--purple-400)" : "none",
        transition: "background 160ms",
      }}>
        <span style={{ display: "inline-flex", alignItems: "baseline", gap: 12 }}>
          <span style={{
            font: "700 22px/1 var(--font-display)",
            color: focused ? "#fff" : "rgba(255,255,255,0.85)",
            letterSpacing: 0.06,
            textTransform: "uppercase",
          }}>{genre.name}</span>
          <span style={{ color: "var(--fg-3)", font: "500 16px var(--font-display)" }}>{genre.count}</span>
        </span>
        {genre.saved && (
          <span style={{ color: "var(--purple-400)" }}>
            <Icons.Bookmark size={20} fill="currentColor" />
          </span>
        )}
      </div>
    </FocusRing>
  );
}

window.PosterCard = PosterCard;
window.ContinueCard = ContinueCard;
window.ChannelTile = ChannelTile;
window.GenreRow = GenreRow;
