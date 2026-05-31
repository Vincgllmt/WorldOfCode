// Top-level app: navigation state, screen routing, side rail glue.

function App() {
  // Initial screen + zone via URL
  const params = new URLSearchParams(window.location.search);
  const initialScreen = params.get("screen") || "home";
  const showSettings = initialScreen === "settings";
  const [screen, setScreen] = useState(showSettings ? "home" : initialScreen);
  const [zone, setZone] = useState("content");
  const [railIdx, setRailIdx] = useState(0);
  const [contentPos, setContentPos] = useState([0, 0]);
  const [detailItem, setDetailItem] = useState(
    initialScreen === "detail" ? window.PURPLE_DATA.POSTERS.olivia : null
  );
  const [liveChannel, setLiveChannel] = useState(
    initialScreen === "liveplayer" ? window.PURPLE_DATA.CHANNELS[0] : null
  );
  const [settingsOpen, setSettingsOpen] = useState(showSettings);

  // Sync global zone so screens know to stop reacting when rail owns input
  useEffect(() => { window.__purpleZone = zone; }, [zone]);

  // Rail keyboard handler
  useEffect(() => {
    if (zone !== "rail") return;
    const totalItems = RAIL_ITEMS.length + RAIL_FOOTER.length;
    const handler = (e) => {
      if (e.key === "ArrowDown") {
        setRailIdx(i => Math.min(totalItems - 1, i + 1)); e.preventDefault();
      } else if (e.key === "ArrowUp") {
        setRailIdx(i => Math.max(0, i - 1)); e.preventDefault();
      } else if (e.key === "ArrowRight") {
        // jump to content
        if (railIdx < RAIL_ITEMS.length) {
          const item = RAIL_ITEMS[railIdx];
          setScreen(item.id);
          setContentPos([0, 0]);
          setZone("content");
        }
        e.preventDefault();
      } else if (e.key === "Enter" || e.key === " ") {
        if (railIdx < RAIL_ITEMS.length) {
          setScreen(RAIL_ITEMS[railIdx].id);
          setContentPos([0, 0]);
          setZone("content");
        } else {
          setSettingsOpen(true);
        }
        e.preventDefault();
      } else if (e.key === "Escape") {
        // do nothing — rail is the top
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zone, railIdx]);

  // Wrap content's onBackToRail to move zone back
  const onBackToRail = () => setZone("rail");

  // Intercept ArrowLeft when at col 0 to bounce back to rail
  useEffect(() => {
    if (zone !== "content") return;
    const handler = (e) => {
      if (e.key === "ArrowLeft" && contentPos[1] === 0) {
        setZone("rail"); e.preventDefault();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [zone, contentPos]);

  const navigate = (s, opts = {}) => {
    setScreen(s);
    setContentPos([0, 0]);
    setZone("content");
    if (opts.item) setDetailItem(opts.item);
    if (opts.channel) setLiveChannel(opts.channel);
  };

  const handleActivate = (intent) => {
    if (intent.type === "detail") {
      setDetailItem(intent.item);
      setScreen("detail");
      setContentPos([0, 0]);
    } else if (intent.type === "live") {
      setLiveChannel(intent.channel);
      setScreen("liveplayer");
      setContentPos([0, 0]);
    } else if (intent.type === "navigate") {
      const idx = RAIL_ITEMS.findIndex(r => r.id === intent.to);
      if (idx >= 0) {
        setRailIdx(idx);
        setScreen(intent.to);
        setContentPos([0, 0]);
        setZone("content");
      }
    }
  };

  const onBackFromDetail = () => {
    setScreen("home");
    setContentPos([0, 0]);
    setDetailItem(null);
  };
  const onBackFromLive = () => {
    setScreen("directtv");
    setContentPos([0, 0]);
    setLiveChannel(null);
  };

  // Render
  const railActive = ["home","search","directtv","films","series","downloads"].includes(screen) ? screen : RAIL_ITEMS[railIdx]?.id;

  let content = null;
  if (screen === "connect") {
    content = <ConnectScreen pos={contentPos} setPos={setContentPos} onActivate={handleActivate} />;
  } else if (screen === "home") {
    content = <HomeScreen pos={contentPos} setPos={setContentPos} onActivate={handleActivate} onBackToRail={onBackToRail} />;
  } else if (screen === "directtv") {
    content = <DirectTVScreen pos={contentPos} setPos={setContentPos} onActivate={handleActivate} onBackToRail={onBackToRail} />;
  } else if (screen === "detail" && detailItem) {
    content = <MovieDetailScreen item={detailItem} pos={contentPos} setPos={setContentPos} onBack={onBackFromDetail} />;
  } else if (screen === "liveplayer" && liveChannel) {
    content = <LivePlayerScreen channel={liveChannel} pos={contentPos} setPos={setContentPos} onBack={onBackFromLive} />;
  } else if (screen === "search") {
    content = <SearchScreen pos={contentPos} setPos={setContentPos} onActivate={handleActivate} onBackToRail={onBackToRail} />;
  } else {
    // Fallback: a "coming soon" panel for films/series/downloads (use the home pattern)
    content = (
      <ComingSoonScreen
        title={
          screen === "films" ? "Films" :
          screen === "series" ? "Series" :
          screen === "downloads" ? "Downloads" : "Coming Soon"
        }
        onBackToRail={onBackToRail}
      />
    );
  }

  // ConnectScreen has no rail (pre-login)
  const showRail = screen !== "connect" && screen !== "liveplayer";

  return (
    <div style={{ position: "absolute", inset: 0 }}>
      {content}
      {showRail && (
        <SideRail
          active={railActive}
          expanded={zone === "rail"}
          focusedIdx={railIdx}
        />
      )}
      {showRail && <TopChrome />}
      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}

      {/* DEV: keyboard hint */}
      <div style={{
        position: "absolute", left: "50%", bottom: 18, transform: "translateX(-50%)",
        padding: "10px 18px", borderRadius: 999,
        background: "rgba(11,4,20,0.75)", color: "rgba(255,255,255,0.45)",
        font: "500 14px var(--font-display)", letterSpacing: 0.06,
        border: "1px solid rgba(255,255,255,0.06)",
        zIndex: 100,
        backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)",
      }}>
        ← ↑ ↓ → navigate · ⏎ select · Esc back
      </div>
    </div>
  );
}

function ComingSoonScreen({ title, onBackToRail }) {
  useEffect(() => {
    const h = (e) => {
      if (e.key === "ArrowLeft" || e.key === "Escape") { onBackToRail(); e.preventDefault(); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onBackToRail]);
  return (
    <div style={{ position: "absolute", inset: 0, padding: "100px 0 60px 200px", background: "var(--bg-1)" }}>
      <CapsLabel size={14}>Library</CapsLabel>
      <div style={{ font: "800 56px/1 var(--font-display)", color: "#fff", marginTop: 10 }}>{title}</div>
      <div style={{ marginTop: 60, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 28, paddingRight: 200 }}>
        {Object.values(window.PURPLE_DATA.POSTERS).slice(0, 10).map((p, i) => (
          <PosterCard key={i} item={p} width={240} height={350} />
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("tv-stage")).render(<App />);
