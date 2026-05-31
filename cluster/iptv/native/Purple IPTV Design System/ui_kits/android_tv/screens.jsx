// All major screens: Home, MovieDetail, DirectTV, LivePlayer, Search, Settings, Connect.

/* ============================================================
   HOME SCREEN — immersive hero + content rows.
   Rows:
     0: HERO actions (Play, Info, +Add)
     1: Continue Watching
     2: Trending Films
     3: Top Series
     4: New Releases
   ============================================================ */
function HomeScreen({ pos, setPos, onActivate, onBackToRail }) {
  const { HERO_FEATURED, CONTINUE_WATCHING, TRENDING_FILMS, TOP_SERIES, NEW_RELEASES } = window.PURPLE_DATA;
  const [heroIdx, setHeroIdx] = useState(0);
  const heroPosterCount = HERO_FEATURED.length;
  const featured = HERO_FEATURED[heroIdx];

  const rows = [
    { type: "hero", actions: 3 },
    { type: "row",  label: "Continue watching", items: CONTINUE_WATCHING, w: 380, h: 215, card: "continue" },
    { type: "row",  label: "Trending films",    items: TRENDING_FILMS, w: 220, h: 320, card: "poster" },
    { type: "row",  label: "Top series",        items: TOP_SERIES, w: 220, h: 320, card: "poster" },
    { type: "row",  label: "New releases",      items: NEW_RELEASES, w: 220, h: 320, card: "poster" },
  ];

  useDpad({
    rows: rows.length,
    getCols: (r) => rows[r].type === "hero" ? rows[r].actions : rows[r].items.length,
    pos, setPos,
    onEnter: (r, c) => {
      if (r === 0 && c === 0) onActivate({ type: "detail", item: featured });
      else if (r > 0) onActivate({ type: "detail", item: rows[r].items[c] });
    },
    onBack: () => onBackToRail(),
  });

  // cycle hero every 7s
  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % heroPosterCount), 7000);
    return () => clearInterval(t);
  }, [heroPosterCount]);

  // when focus leaves hero row, snap to row 0 col 0 ? we let dpad handle
  const [r, c] = pos;

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {/* HERO BG */}
      <div key={heroIdx} style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 720,
        background: featured.hero,
        backgroundSize: "cover", backgroundPosition: "center",
        transition: "background 600ms ease-out",
      }}>
        {/* faux key art darken */}
        <div style={{
          position: "absolute", inset: 0,
          background: `radial-gradient(ellipse at 65% 30%, transparent 0%, rgba(0,0,0,0.35) 60%, rgba(20,8,42,0.9) 100%)`,
        }} />
      </div>
      {/* protection gradients */}
      <div className="hero-protection-bottom" style={{
        position: "absolute", left: 0, right: 0, bottom: 0, top: 0, pointerEvents: "none",
      }} />
      <div className="hero-protection-left" style={{
        position: "absolute", left: 0, top: 0, bottom: 0, width: 1100, pointerEvents: "none",
      }} />

      {/* HERO CONTENT */}
      <div style={{
        position: "absolute", left: 200, top: 140, width: 920,
        display: "flex", flexDirection: "column", gap: 28,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <CapsLabel size={16}>★ Featured this week</CapsLabel>
          <span style={{ color: "rgba(255,255,255,0.5)", font: "500 16px/1 var(--font-display)" }}>· in 4K HDR</span>
        </div>
        <div key={"title-"+heroIdx} style={{
          font: "800 92px/0.95 var(--font-display)",
          color: "#fff", letterSpacing: -0.04, whiteSpace: "pre-line",
          textShadow: "0 4px 32px rgba(0,0,0,0.4)",
        }}>
          {featured.logo || featured.title}
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {featured.rating > 0 && <RatingChip value={featured.rating} />}
          <MetaChip>{featured.year}</MetaChip>
          <MetaChip>{featured.duration}</MetaChip>
          {(featured.genres || []).map(g => <MetaChip key={g}>{g}</MetaChip>)}
        </div>
        <div style={{
          maxWidth: 780, color: "rgba(255,255,255,0.82)",
          font: "400 22px/1.5 var(--font-display)",
        }}>
          {featured.tagline || featured.plot || ""}
        </div>
        <div style={{ display: "flex", gap: 18, marginTop: 8 }}>
          <Button variant="primary" focused={r === 0 && c === 0}
            icon={<Icons.Play size={26} />}>Play</Button>
          <Button variant="secondary" focused={r === 0 && c === 1}
            icon={<Icons.Info size={24} />}>More info</Button>
          <Button variant="ghost" focused={r === 0 && c === 2}
            icon={<Icons.Plus size={24} />}>My list</Button>
        </div>
        {/* hero pager dots */}
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          {HERO_FEATURED.map((_, i) => (
            <span key={i} style={{
              width: i === heroIdx ? 28 : 8, height: 4, borderRadius: 999,
              background: i === heroIdx ? "var(--purple-400)" : "rgba(255,255,255,0.3)",
              transition: "all 240ms",
            }} />
          ))}
        </div>
      </div>

      {/* CONTENT ROWS */}
      <div style={{
        position: "absolute", left: 0, right: 0, top: 720, bottom: 0,
        background: "linear-gradient(180deg, transparent 0%, var(--bg-1) 25%)",
        padding: "40px 0 64px 200px",
        display: "flex", flexDirection: "column", gap: 36,
        overflow: "hidden",
      }}>
        {rows.slice(1).map((row, rowIdxOffset) => {
          const rowIdx = rowIdxOffset + 1;
          const isActiveRow = r === rowIdx;
          const focusedCol = isActiveRow ? c : -1;
          // compute pan so focused card stays in view
          const cardW = row.w + 24;
          const pan = isActiveRow ? Math.max(0, focusedCol * cardW - 200) : 0;
          return (
            <div key={row.label} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <CapsLabel size={15} color={isActiveRow ? "var(--purple-300)" : "rgba(255,255,255,0.5)"}>
                {row.label}
              </CapsLabel>
              <div style={{ position: "relative", overflow: "visible" }}>
                <div style={{
                  display: "flex", gap: 24,
                  transform: `translateX(-${pan}px)`,
                  transition: "transform 260ms cubic-bezier(0.22, 1, 0.36, 1)",
                  paddingLeft: 4, paddingRight: 200,
                }}>
                  {row.items.map((it, i) => (
                    row.card === "continue"
                      ? <ContinueCard key={i} item={it} focused={isActiveRow && i === focusedCol} width={row.w} height={row.h} />
                      : <PosterCard key={i} item={it} focused={isActiveRow && i === focusedCol} width={row.w} height={row.h} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   MOVIE DETAIL — full screen recreation of the mobile detail
   page, transposed to TV (left text / right info pattern).
   ============================================================ */
function MovieDetailScreen({ item, pos, setPos, onBack }) {
  const cols = [3]; // Play / Download / +My List
  useDpad({
    rows: 1, getCols: () => cols[0],
    pos, setPos, onEnter: () => {}, onBack,
  });
  const [, c] = pos;

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-1)" }}>
      {/* Hero artwork on the right side */}
      <div style={{
        position: "absolute", right: 0, top: 0, width: 1200, height: 800,
        background: item.hero || item.art,
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 30%, transparent 30%, rgba(20,8,42,0.5) 80%)",
        }} />
      </div>
      <div style={{
        position: "absolute", right: 0, top: 0, width: 1200, bottom: 0,
        background: "linear-gradient(90deg, var(--bg-1) 0%, rgba(20,8,42,0.5) 35%, transparent 70%)",
      }} />
      <div style={{
        position: "absolute", right: 0, top: 580, width: 1200, height: 600,
        background: "linear-gradient(180deg, transparent 0%, var(--bg-1) 70%)",
      }} />

      {/* Back affordance */}
      <div style={{ position: "absolute", left: 96, top: 54, display: "inline-flex", alignItems: "center", gap: 12, color: "rgba(255,255,255,0.6)", font: "500 18px var(--font-display)" }}>
        <Icons.ArrowBack size={22} /> Back
      </div>

      {/* Content */}
      <div style={{
        position: "absolute", left: 200, top: 200, width: 920,
        display: "flex", flexDirection: "column", gap: 26,
      }}>
        <CapsLabel size={14}>Film</CapsLabel>
        <div style={{
          font: "800 86px/0.95 var(--font-display)", color: "#fff", whiteSpace: "pre-line", letterSpacing: -0.03,
        }}>
          {item.logo || item.title}
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
          {item.rating > 0 && <RatingChip value={item.rating} />}
          <MetaChip>{item.year}</MetaChip>
          <MetaChip>{item.duration}</MetaChip>
          {(item.genres || []).map(g => <MetaChip key={g}>{g}</MetaChip>)}
        </div>
        <div style={{
          maxWidth: 820, color: "rgba(255,255,255,0.78)",
          font: "400 22px/1.55 var(--font-display)",
        }}>
          {item.plot || item.tagline || "Plot description not available."}
        </div>
        {item.director && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <CapsLabel size={12} color="rgba(255,255,255,0.5)">Director</CapsLabel>
            <div style={{ font: "600 22px var(--font-display)", color: "#fff" }}>{item.director}</div>
          </div>
        )}
        <div style={{ display: "flex", gap: 18, marginTop: 16 }}>
          <Button variant="primary"   focused={c === 0} icon={<Icons.Play size={24} />}>Play</Button>
          <Button variant="secondary" focused={c === 1} icon={<Icons.Download size={22} />}>Download</Button>
          <Button variant="ghost"     focused={c === 2} icon={<Icons.Plus size={22} />}>My list</Button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   DIRECT TV — channel browse with horizontal genre rows.
   ============================================================ */
function DirectTVScreen({ pos, setPos, onActivate, onBackToRail }) {
  const { CHANNELS } = window.PURPLE_DATA;
  // group by genre
  const groups = useMemo(() => {
    const g = {};
    CHANNELS.forEach(ch => { (g[ch.group] = g[ch.group] || []).push(ch); });
    return Object.entries(g); // [ [name, channels[]], ... ]
  }, []);

  useDpad({
    rows: groups.length,
    getCols: (r) => groups[r][1].length,
    pos, setPos,
    onEnter: (r, c) => onActivate({ type: "live", channel: groups[r][1][c] }),
    onBack: onBackToRail,
  });
  const [r, c] = pos;

  return (
    <div style={{ position: "absolute", inset: 0, padding: "100px 0 60px 200px", background: "var(--bg-1)" }}>
      <div style={{ marginBottom: 40 }}>
        <CapsLabel size={14}>Live</CapsLabel>
        <div style={{ font: "800 56px/1 var(--font-display)", color: "#fff", marginTop: 10, letterSpacing: -0.02 }}>
          Direct TV
        </div>
        <div style={{ color: "var(--fg-3)", font: "400 20px var(--font-display)", marginTop: 12 }}>
          11,747 channels · 75 genres
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 40, height: 720, overflow: "hidden" }}>
        {groups.map(([name, chans], rowIdx) => {
          const isActive = r === rowIdx;
          const cardW = 240 + 24;
          const pan = isActive ? Math.max(0, c * cardW - 200) : 0;
          return (
            <div key={name} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 14 }}>
                <CapsLabel size={16} color={isActive ? "var(--purple-300)" : "rgba(255,255,255,0.5)"}>
                  {name}
                </CapsLabel>
                <span style={{ color: "var(--fg-3)", font: "400 16px var(--font-mono)" }}>
                  ({chans.length})
                </span>
                <Icons.Chevron size={16} stroke="var(--fg-3)" />
              </div>
              <div style={{ overflow: "visible" }}>
                <div style={{
                  display: "flex", gap: 24,
                  transform: `translateX(-${pan}px)`,
                  transition: "transform 240ms cubic-bezier(0.22, 1, 0.36, 1)",
                }}>
                  {chans.map((ch, i) => (
                    <ChannelTile key={ch.id} channel={ch} focused={isActive && i === c} size={240} />
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ============================================================
   LIVE PLAYER — fullscreen video bg + LIVE overlay + info card.
   ============================================================ */
function LivePlayerScreen({ channel, pos, setPos, onBack }) {
  useDpad({
    rows: 1, getCols: () => 4,
    pos, setPos, onBack, onEnter: () => {},
  });
  const [, c] = pos;
  // Overlay starts visible; auto-hides on inactivity (disabled in kit demo for visibility)
  const overlay = true;

  return (
    <div style={{ position: "absolute", inset: 0, background: "#000" }}>
      {/* video stand-in */}
      <div style={{
        position: "absolute", inset: 0,
        background: "radial-gradient(circle at 50% 40%, #1a4d2e 0%, #0a2515 50%, #000 100%)",
      }}>
        {/* stadium grass texture */}
        <div style={{ position: "absolute", inset: 0, opacity: 0.4,
          backgroundImage: "repeating-linear-gradient(90deg, transparent, transparent 70px, rgba(255,255,255,0.04) 70px, rgba(255,255,255,0.04) 140px)" }} />
        <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)", color: "rgba(255,255,255,0.04)", font: "800 200px var(--font-display)" }}>
          LIVE
        </div>
      </div>

      {/* Broadcaster watermark */}
      <div style={{ position: "absolute", left: 60, top: 60, color: "rgba(255,255,255,0.6)", font: "700 22px var(--font-display)" }}>
        +SPORT 360
      </div>
      <div style={{ position: "absolute", right: 60, top: 60, color: "rgba(255,255,255,0.6)", font: "700 18px/1.3 var(--font-mono)", textAlign: "right" }}>
        74:45<br/>
        <span style={{ font: "600 14px var(--font-display)" }}>FRE 0 – 3 AVL</span>
      </div>

      {overlay && (
        <>
          {/* top chrome */}
          <div style={{
            position: "absolute", left: 0, right: 0, top: 0, height: 130,
            background: "linear-gradient(180deg, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0) 100%)",
            padding: "44px 96px 0", display: "flex", alignItems: "center", gap: 24, color: "#fff",
            zIndex: 5,
          }}>
            <Icons.ArrowBack size={26} />
            <LiveDot />
            <span style={{ color: "rgba(255,255,255,0.85)", font: "600 22px var(--font-display)" }}>{channel.name}</span>
          </div>

          {/* bottom card */}
          <div style={{
            position: "absolute", left: 96, right: 96, bottom: 80,
            padding: "32px 36px", borderRadius: 18,
            background: "rgba(11,4,20,0.92)",
            border: "1px solid rgba(255,255,255,0.06)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            display: "flex", flexDirection: "column", gap: 18,
            zIndex: 5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <LiveBadge />
              <span style={{ color: "var(--fg-3)", font: "500 18px var(--font-mono)" }}>15:55 – 18:00</span>
            </div>
            <div style={{ font: "700 38px/1.1 var(--font-display)", color: "#fff" }}>
              LIVE: Premier League · Matchday 14
            </div>
            <div style={{
              height: 5, background: "rgba(255,255,255,0.15)", borderRadius: 999, overflow: "hidden",
            }}>
              <div style={{ width: "62%", height: "100%", background: "var(--purple-400)" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ color: "var(--fg-2)", font: "500 18px var(--font-display)" }}>
                <span style={{ color: "var(--purple-300)" }}>Next:</span> Inside Sport · Post-match analysis
              </div>
              <div style={{ display: "flex", gap: 14 }}>
                <Button variant="ghost" focused={c === 0} icon={<Icons.Pause size={22} />}>Pause</Button>
                <Button variant="ghost" focused={c === 1} icon={<Icons.Subtitles size={22} />}>Subtitles</Button>
                <Button variant="ghost" focused={c === 2} icon={<Icons.Eq size={22} />}>Audio</Button>
                <Button variant="ghost" focused={c === 3} icon={<Icons.Cast size={22} />}>Cast</Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ============================================================
   SEARCH — genre list (left) + grid (right).
   ============================================================ */
function SearchScreen({ pos, setPos, onActivate, onBackToRail }) {
  const { GENRES, TRENDING_FILMS } = window.PURPLE_DATA;
  // 2-column layout. Row 0 = search field. Row 1+ = matrix.
  const cols = 2;
  const genreList = GENRES.slice(0, 8);
  const results = [...TRENDING_FILMS, ...TRENDING_FILMS].slice(0, 16);

  // Use rows = genreList.length, with col 0 = genre, col 1 = results "page"
  // Simpler: treat each pane as its own column zone
  useDpad({
    rows: Math.max(genreList.length, Math.ceil(results.length / 4)),
    getCols: () => 2,
    pos, setPos, onEnter: () => {}, onBack: onBackToRail,
  });
  const [r, c] = pos;
  const focusedGenre = c === 0 ? r : -1;
  const focusedResult = c === 1 ? r : -1;

  return (
    <div style={{ position: "absolute", inset: 0, padding: "100px 0 60px 200px", background: "var(--bg-1)" }}>
      <div style={{ marginBottom: 36 }}>
        <CapsLabel size={14}>Browse</CapsLabel>
        <div style={{ font: "800 56px/1 var(--font-display)", color: "#fff", marginTop: 10 }}>Search</div>
        <div style={{
          marginTop: 24, padding: "20px 26px", borderRadius: 14,
          background: "var(--bg-2)", border: "1px solid rgba(255,255,255,0.04)",
          display: "inline-flex", alignItems: "center", gap: 16, width: 600,
        }}>
          <Icons.Search size={22} stroke="var(--purple-400)" />
          <span style={{ color: "rgba(255,255,255,0.4)", font: "400 22px var(--font-display)" }}>
            Search movies, series, channels...
          </span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "440px 1fr", gap: 60, height: 720 }}>
        {/* GENRE LIST */}
        <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
          <CapsLabel size={13} color="rgba(255,255,255,0.5)">All genres · 11747</CapsLabel>
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
            {genreList.map((g, i) => (
              <GenreRow key={g.name} genre={g} focused={focusedGenre === i} />
            ))}
          </div>
        </div>
        {/* RESULTS GRID */}
        <div style={{ paddingRight: 200 }}>
          <CapsLabel size={13} color="rgba(255,255,255,0.5)">Top in genre</CapsLabel>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 28, marginTop: 18 }}>
            {results.slice(0, 8).map((it, i) => (
              <PosterCard key={i} item={it} focused={focusedResult === Math.floor(i / 4) && c === 1 && false /* TODO 2d nav */} width={240} height={350} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SETTINGS SHEET — modal over blurred background.
   ============================================================ */
function SettingsSheet({ onClose }) {
  const [lang, setLang] = useState("EN");
  const [size, setSize] = useState("Medium");
  const [color, setColor] = useState("white");
  const [bg, setBg] = useState(false);
  // 0 = lang FR/EN, 1 = size, 2 = color, 3 = bg toggle, 4 = sign out
  const [pos, setPos] = useState([0, 1]);
  const cols = [2, 3, 2, 1, 1];

  useDpad({
    rows: cols.length,
    getCols: (r) => cols[r],
    pos, setPos, onBack: onClose,
    onEnter: (r, c) => {
      if (r === 0) setLang(c === 0 ? "FR" : "EN");
      if (r === 1) setSize(["Small","Medium","Large"][c]);
      if (r === 2) setColor(c === 0 ? "white" : "yellow");
      if (r === 3) setBg(b => !b);
      if (r === 4) onClose();
    },
  });
  const [r, c] = pos;

  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 50,
      background: "rgba(11,4,20,0.82)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <div style={{
        width: 920, maxHeight: 920, padding: "48px 56px",
        background: "linear-gradient(180deg, rgba(27,14,54,0.95), rgba(20,8,42,0.95))",
        borderRadius: 28, border: "1px solid rgba(255,255,255,0.06)",
        boxShadow: "0 40px 100px rgba(0,0,0,0.7)",
        display: "flex", flexDirection: "column", gap: 36,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ font: "800 42px var(--font-display)", color: "#fff" }}>Settings &amp; Account</div>
          <div style={{ color: "rgba(255,255,255,0.4)", display: "inline-flex", alignItems: "center", gap: 8, font: "500 16px var(--font-display)" }}>
            <Icons.Close size={20} /> Esc
          </div>
        </div>

        {/* Language */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CapsLabel size={14}>Language</CapsLabel>
          <div style={{ display: "flex", gap: 14 }}>
            {["FR","EN"].map((l, i) => {
              const active = lang === l;
              const focused = r === 0 && c === i;
              return (
                <FocusRing key={l} focused={focused} radius={14}>
                  <div style={{
                    padding: "18px 36px", borderRadius: 14,
                    background: active ? "var(--purple-400)" : "var(--bg-2)",
                    color: active ? "#fff" : "rgba(255,255,255,0.6)",
                    font: "700 22px var(--font-display)",
                  }}>{l}</div>
                </FocusRing>
              );
            })}
          </div>
        </div>

        {/* Subtitle size */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CapsLabel size={14}>Subtitle style · Size</CapsLabel>
          <div style={{ display: "flex", gap: 14 }}>
            {["Small","Medium","Large"].map((s, i) => {
              const active = size === s;
              const focused = r === 1 && c === i;
              return (
                <FocusRing key={s} focused={focused} radius={14}>
                  <div style={{
                    padding: "16px 28px", borderRadius: 14,
                    background: "var(--bg-2)",
                    border: active ? "2px solid var(--purple-400)" : "2px solid transparent",
                    color: active ? "var(--purple-300)" : "rgba(255,255,255,0.7)",
                    font: "600 22px var(--font-display)",
                  }}>{s}</div>
                </FocusRing>
              );
            })}
          </div>
        </div>

        {/* Subtitle color */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CapsLabel size={14}>Color</CapsLabel>
          <div style={{ display: "flex", gap: 14 }}>
            {[{ k: "white", l: "White", dot: "#fff" }, { k: "yellow", l: "Yellow", dot: "#F2E028" }].map((o, i) => {
              const active = color === o.k;
              const focused = r === 2 && c === i;
              return (
                <FocusRing key={o.k} focused={focused} radius={14}>
                  <div style={{
                    padding: "16px 24px", borderRadius: 14,
                    background: "var(--bg-2)",
                    border: active ? "2px solid var(--purple-400)" : "2px solid transparent",
                    color: active ? "#fff" : "rgba(255,255,255,0.7)",
                    font: "600 22px var(--font-display)",
                    display: "inline-flex", alignItems: "center", gap: 12,
                  }}>
                    <span style={{ width: 16, height: 16, borderRadius: 999, background: o.dot, boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.2)" }} />
                    {o.l}
                  </div>
                </FocusRing>
              );
            })}
          </div>
        </div>

        {/* Subtitle preview */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <CapsLabel size={14} color="rgba(255,255,255,0.5)">Preview</CapsLabel>
          <div style={{
            padding: "28px 36px", borderRadius: 14, background: "#000",
            color: color === "white" ? "#fff" : "#F2E028",
            font: `${size === "Small" ? 22 : size === "Medium" ? 28 : 36}px var(--font-display)`,
            fontWeight: 700, textAlign: "center",
          }}>
            Ceci est un aperçu des sous-titres
          </div>
        </div>

        {/* Sign out */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 24 }}>
          <div style={{ font: "700 26px var(--font-display)", color: "#fff" }}>Sign out?</div>
          <div style={{ font: "400 18px var(--font-display)", color: "rgba(255,255,255,0.6)" }}>
            All your local data will be kept on this device.
          </div>
          <FocusRing focused={r === 4 && c === 0} radius={14}>
            <div style={{
              padding: "16px 28px", borderRadius: 14, display: "inline-block",
              background: "rgba(255,90,95,0.15)",
              border: "1.5px solid rgba(255,90,95,0.5)",
              color: "#FF8A8E", font: "600 20px var(--font-display)",
              width: "fit-content", marginTop: 6,
            }}>Sign out</div>
          </FocusRing>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   CONNECT / SPLASH — initial M3U / Credentials / File picker.
   ============================================================ */
function ConnectScreen({ pos, setPos, onActivate }) {
  // rows: 0 = lang segment, 1 = source tabs, 2 = input, 3 = connect
  const cols = [2, 3, 1, 1];
  useDpad({
    rows: cols.length,
    getCols: (r) => cols[r],
    pos, setPos, onEnter: (r, c) => {
      if (r === 3) onActivate({ type: "navigate", to: "home" });
    },
  });
  const [r, c] = pos;
  const [lang, setLang] = useState("EN");
  const [src, setSrc] = useState(0);

  // Sync state when user activates a row
  useEffect(() => {
    if (r === 0) setLang(c === 0 ? "FR" : "EN");
    if (r === 1) setSrc(c);
  }, [r, c]);

  const sources = [
    { label: "M3U LINK", icon: Icons.Link, ph: "https://playlist.example.com/get.php?username=demo&password=…" },
    { label: "CREDENTIALS", icon: Icons.User, ph: "demo_user · ●●●●●●●●" },
    { label: "FILE",     icon: Icons.File, ph: "playlist_2026.m3u8 · 4.2 MB" },
  ];

  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--bg-1)" }}>
      <div style={{
        position: "absolute", left: "50%", top: 80, transform: "translateX(-50%)",
        display: "flex", gap: 14,
      }}>
        {["FR", "EN"].map((l, i) => {
          const active = lang === l;
          return (
            <FocusRing key={l} focused={r === 0 && c === i} radius={14}>
              <div style={{
                padding: "14px 28px", borderRadius: 14,
                background: active ? "var(--purple-400)" : "var(--bg-2)",
                color: active ? "#fff" : "rgba(255,255,255,0.55)",
                font: "700 18px var(--font-display)",
              }}>{l}</div>
            </FocusRing>
          );
        })}
      </div>

      <div style={{
        position: "absolute", left: "50%", top: 220, transform: "translateX(-50%)",
        display: "flex", flexDirection: "column", alignItems: "center", gap: 28,
        width: 880,
      }}>
        <img src="../../assets/logo_mark_tight.png" alt="" style={{ width: 280, height: 190, objectFit: "contain" }} />
        <div style={{
          padding: "16px 50px", borderRadius: 999, border: "1.5px solid var(--purple-400)",
          font: "800 26px var(--font-display)", letterSpacing: 0.04, whiteSpace: "nowrap",
        }}>
          <span style={{ color: "var(--purple-400)" }}>PURPLE </span>
          <span style={{ color: "#fff", fontWeight: 400 }}>IPTV</span>
        </div>
        <div style={{ font: "400 22px/1.5 var(--font-display)", color: "var(--fg-2)", textAlign: "center", maxWidth: 720 }}>
          Connect to your IPTV service to access your favorite content.
        </div>

        {/* tabs */}
        <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
          {sources.map((s, i) => {
            const active = src === i;
            const focused = r === 1 && c === i;
            return (
              <FocusRing key={s.label} focused={focused} radius={14}>
                <div style={{
                  padding: "16px 28px", borderRadius: 14, background: "var(--bg-2)",
                  border: active ? "2px solid var(--purple-400)" : "2px solid transparent",
                  color: active ? "var(--purple-300)" : "rgba(255,255,255,0.6)",
                  font: "700 16px var(--font-display)", letterSpacing: 0.08,
                  display: "inline-flex", alignItems: "center", gap: 10,
                }}>
                  <s.icon size={18} />
                  {s.label}
                </div>
              </FocusRing>
            );
          })}
        </div>

        {/* input */}
        <FocusRing focused={r === 2 && c === 0} radius={14}>
          <div style={{
            padding: "22px 26px", borderRadius: 14, width: 820,
            background: "var(--bg-2)", border: "1px solid rgba(255,255,255,0.06)",
            display: "flex", alignItems: "center", gap: 16,
          }}>
            {(() => { const Ico = sources[src].icon; return <Ico size={22} stroke="var(--purple-400)" />; })()}
            <span style={{ color: "rgba(255,255,255,0.5)", font: "400 20px var(--font-mono)" }}>
              {sources[src].ph}
            </span>
          </div>
        </FocusRing>

        {/* info pill */}
        <div style={{
          padding: "16px 22px", borderRadius: 14, background: "rgba(179,107,252,0.08)",
          border: "1px solid rgba(179,107,252,0.25)",
          display: "flex", alignItems: "center", gap: 12, width: 820, boxSizing: "border-box",
        }}>
          <Icons.Info size={22} stroke="var(--purple-300)" />
          <span style={{ color: "var(--fg-2)", font: "400 18px var(--font-display)" }}>
            3-day free trial included. Premium activation available after.
          </span>
        </div>

        {/* Connect */}
        <FocusRing focused={r === 3 && c === 0} radius={14}>
          <div style={{
            width: 820, padding: "22px 0", textAlign: "center", borderRadius: 14,
            background: "var(--purple-400)", color: "#fff",
            font: "800 22px var(--font-display)", letterSpacing: 0.08,
          }}>CONNECT</div>
        </FocusRing>
      </div>
    </div>
  );
}

window.HomeScreen = HomeScreen;
window.MovieDetailScreen = MovieDetailScreen;
window.DirectTVScreen = DirectTVScreen;
window.LivePlayerScreen = LivePlayerScreen;
window.SearchScreen = SearchScreen;
window.SettingsSheet = SettingsSheet;
window.ConnectScreen = ConnectScreen;
