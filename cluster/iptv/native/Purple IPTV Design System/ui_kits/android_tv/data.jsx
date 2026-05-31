// Fake data for the kit. Posters are CSS gradients tied to mood.
// In production these would come from the M3U playlist / VOD API.

const POSTERS = {
  olivia:       { title: "Olivia", year: 2025, rating: 7.2, duration: "01:10:48", genres: ["Animation", "Comédie", "Drame", "Familial"], director: "Irene Iborra Rizo", art: "linear-gradient(140deg, #ff8c42 0%, #f04e84 40%, #5a1d8f 90%)", logo: "OLIVIA", plot: "À 12 ans, Olivia voit son quotidien bouleversé du jour au lendemain. Elle va devoir s'habituer à une nouvelle vie plus modeste et veiller seule sur son petit frère Tim. Heureusement, leur rencontre avec des voisins chaleureux et hauts en couleur va transformer leur monde en un vrai film d'aventure." },
  carpenter:    { title: "The Carpenter's Son", year: 2025, rating: 5.7, duration: "01:58:00", genres: ["Drama", "Thriller"], director: "Lotfy Nathan", art: "linear-gradient(160deg, #6b1e1e 0%, #2a0808 60%, #14082A 100%)", logo: "THE CARPENTER'S SON" },
  witchboard:   { title: "Witchboard", year: 2024, rating: 5.9, duration: "01:46:00", genres: ["Horror", "Thriller"], director: "Chuck Russell", art: "linear-gradient(140deg, #f5b800 0%, #b54a00 35%, #1a0a3a 95%)", logo: "WITCHBOARD" },
  sijenavais:   { title: "Si j'en avais la force", year: 2025, rating: 6.35, duration: "01:42:00", genres: ["Drama"], director: "Ros Byrne", art: "linear-gradient(140deg, #6dbac4 0%, #2a4757 50%, #0e1828 100%)", logo: "SI J'EN AVAIS LA FORCE" },
  rumba:        { title: "Rumba Royale", year: 2024, rating: 0, duration: "02:14:00", genres: ["Drama", "Music"], director: "Sékou Traoré", art: "linear-gradient(140deg, #d97b3d 0%, #5b2a1e 50%, #1a0a3a 100%)", logo: "RUMBA ROYALE" },
  ladies:       { title: "Ladies First", year: 2024, rating: 6.222, duration: "01:38:00", genres: ["Comedy"], director: "Sue Heel", art: "linear-gradient(140deg, #ff3366 0%, #b91a4a 40%, #2c1248 100%)", logo: "LADIES FIRST" },
  kremlin:      { title: "Le Mage du Kremlin", year: 2025, rating: 6.4, duration: "02:18:00", genres: ["Drama", "Politique"], director: "Olivier Assayas", art: "linear-gradient(140deg, #2a2e3f 0%, #11141b 50%, #0a0d14 100%)", logo: "LE MAGE\nDU KREMLIN" },
  duneIII:      { title: "Dune: Part Three", year: 2026, rating: 8.4, duration: "02:46:00", genres: ["Sci-Fi", "Adventure"], director: "Denis Villeneuve", art: "linear-gradient(140deg, #b87333 0%, #5c3010 40%, #0e0a1f 100%)", logo: "DUNE\nPART THREE" },
  matrix5:      { title: "The Matrix V", year: 2026, rating: 7.9, duration: "02:21:00", genres: ["Sci-Fi", "Action"], director: "Drew Goddard", art: "linear-gradient(140deg, #0f7a1c 0%, #0b3014 50%, #050a0a 100%)", logo: "THE MATRIX V" },
  furiosa2:     { title: "Furiosa: Wasteland", year: 2025, rating: 7.6, duration: "02:24:00", genres: ["Action"], director: "George Miller", art: "linear-gradient(140deg, #e8631a 0%, #7a2410 50%, #1c0c10 100%)", logo: "FURIOSA\nWASTELAND" },
  spider3:      { title: "Spider-Verse III", year: 2026, rating: 8.7, duration: "02:14:00", genres: ["Animation"], director: "Joaquim Dos Santos", art: "linear-gradient(140deg, #ff0064 0%, #6b1e9b 50%, #0d122a 100%)", logo: "SPIDER-VERSE III" },
  oppen2:       { title: "Truman", year: 2025, rating: 8.1, duration: "02:42:00", genres: ["Biographie"], director: "Christopher Nolan", art: "linear-gradient(140deg, #c47a4a 0%, #4a2618 50%, #0c0b0e 100%)", logo: "TRUMAN" },
};

const SERIES = {
  naruto:    { title: "Naruto", episodes: 220, season: 9, art: "linear-gradient(140deg, #ff8a3d 0%, #b34a00 60%, #1d0a3a 100%)", logo: "NARUTO" },
  fallout2:  { title: "Fallout · S2", episodes: 8, season: 2, art: "linear-gradient(140deg, #f5d342 0%, #6e5818 50%, #14082A 100%)", logo: "FALLOUT" },
  severance3:{ title: "Severance · S3", episodes: 10, season: 3, art: "linear-gradient(140deg, #5b6bf5 0%, #1c2872 60%, #060919 100%)", logo: "SEVERANCE" },
  arcane3:   { title: "Arcane · S3", episodes: 9, season: 3, art: "linear-gradient(140deg, #00d4ff 0%, #6e25a3 50%, #170a2c 100%)", logo: "ARCANE" },
  squidg3:   { title: "Squid Game · S3", episodes: 7, season: 3, art: "linear-gradient(140deg, #ff2858 0%, #6e0d1c 50%, #100a16 100%)", logo: "SQUID GAME" },
  succession5: { title: "Succession · S5", episodes: 10, season: 5, art: "linear-gradient(140deg, #b58a3a 0%, #2d1e0c 60%, #0a0a0a 100%)", logo: "SUCCESSION" },
};

const CHANNELS = [
  { id: "frsport1", name: "FR · FRANCE SPORT", group: "FRANCE SPORT", art: "linear-gradient(135deg, #0055A4 0% 33%, #fff 33% 66%, #EF4135 66% 100%)" },
  { id: "frsport2", name: "FR · CANAL+ SPORT", group: "FRANCE SPORT", art: "linear-gradient(135deg, #0055A4 0% 33%, #fff 33% 66%, #EF4135 66% 100%)" },
  { id: "frsport3", name: "FR · PRIME SPORTS",  group: "FRANCE SPORT", art: "linear-gradient(135deg, #1b0e36, #6B22C0)", overlay: "+SPORT" },
  { id: "frsport4", name: "FR · BEIN SPORTS 1", group: "FRANCE SPORT", art: "linear-gradient(135deg, #8b0000, #2c0000)", overlay: "beIN" },
  { id: "frsport5", name: "FR · RMC SPORT",     group: "FRANCE SPORT", art: "linear-gradient(135deg, #0a1a3e, #16294b)", overlay: "RMC" },
  { id: "frsport6", name: "FR · L'EQUIPE",      group: "FRANCE SPORT", art: "linear-gradient(135deg, #ff8a00, #c54600)", overlay: "L'ÉQUIPE" },
  { id: "afr1", name: "AFRICANS CHANNELS",      group: "AFRIQUE",      art: "linear-gradient(135deg, #ff6a00, #ffd000 30%, #ff007a 70%, #6d27d2)" },
  { id: "afr2", name: "● AFRICA ●",             group: "AFRIQUE",      art: "linear-gradient(135deg, #0a0a0a, #2a2a2a)" },
  { id: "afr3", name: "TRACE AFRICA",           group: "AFRIQUE",      art: "linear-gradient(135deg, #009a44, #0a3a16)", overlay: "TRACE" },
  { id: "afr4", name: "CANAL+ AFRIQUE",         group: "AFRIQUE",      art: "linear-gradient(135deg, #2a4d2a, #0d1d0d)", overlay: "CANAL+" },
  { id: "alb1", name: "● TOP CHANNEL",          group: "ALBANIA",      art: "radial-gradient(circle at center, #fff 0 25%, #E41E20 25% 75%, #2a0606 75%)" },
  { id: "alb2", name: "● TV KLAN",              group: "ALBANIA",      art: "radial-gradient(circle at center, #fff 0 22%, #E41E20 22% 80%, #200404 80%)" },
];

const GENRES = [
  { name: "FRANCE SPORT", count: 163, saved: true },
  { name: "AFRIQUE",      count: 336 },
  { name: "ALBANIA",      count: 212 },
  { name: "ALGERIE",      count: 40 },
  { name: "ALL CHANNELS", count: 24 },
  { name: "ARABIC",       count: 1098 },
  { name: "BELGIQUE",     count: 75 },
  { name: "DEUTSCHLAND",  count: 412 },
  { name: "ESPAÑA",       count: 287 },
  { name: "ITALIA",       count: 312 },
  { name: "MAROC",        count: 56 },
  { name: "TUNISIE",      count: 38 },
  { name: "TURKIYE",      count: 198 },
  { name: "UK · ENGLAND", count: 256 },
  { name: "USA · ENGLISH",count: 632 },
];

const CONTINUE_WATCHING = [
  { ...POSTERS.kremlin, progress: 0.42 },
  { ...SERIES.severance3, progress: 0.78, kind: "series", episode: "S3 E5 · Trouble Coffee" },
  { ...POSTERS.duneIII, progress: 0.18 },
  { ...SERIES.naruto, progress: 0.10, kind: "series", episode: "S9 E2 · Naruto" },
  { ...POSTERS.witchboard, progress: 0.91 },
];

const TRENDING_FILMS = [POSTERS.duneIII, POSTERS.spider3, POSTERS.furiosa2, POSTERS.matrix5, POSTERS.oppen2, POSTERS.olivia, POSTERS.kremlin, POSTERS.carpenter];
const TOP_SERIES = [SERIES.severance3, SERIES.arcane3, SERIES.fallout2, SERIES.squidg3, SERIES.succession5, SERIES.naruto];
const NEW_RELEASES = [POSTERS.olivia, POSTERS.ladies, POSTERS.rumba, POSTERS.sijenavais, POSTERS.witchboard, POSTERS.carpenter];

const HERO_FEATURED = [
  { ...POSTERS.duneIII, hero: "linear-gradient(180deg, #1a1003 0%, #4a3015 50%, #b87333 100%)", tagline: "The saga continues. War for the spice." },
  { ...POSTERS.spider3, hero: "linear-gradient(180deg, #100726 0%, #461b6c 50%, #ff0064 100%)", tagline: "Across the Spider-Verse. Beyond every reality." },
  { ...POSTERS.olivia,  hero: "linear-gradient(180deg, #14082A 0%, #5a1d8f 45%, #ff8c42 100%)", tagline: "Une nouvelle vie. Une vraie aventure." },
];

window.PURPLE_DATA = { POSTERS, SERIES, CHANNELS, GENRES, CONTINUE_WATCHING, TRENDING_FILMS, TOP_SERIES, NEW_RELEASES, HERO_FEATURED };
