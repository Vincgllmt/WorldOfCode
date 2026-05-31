// Lucide-style stroke icons. Single file for easy reuse.
const Ic = ({ children, size = 24, stroke = "currentColor", fill = "none", sw = 2, style }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {children}
  </svg>
);

const Icons = {
  Home:    (p) => <Ic {...p}><path d="M3 12l9-9 9 9"/><path d="M5 10v10h14V10"/></Ic>,
  Search:  (p) => <Ic {...p}><circle cx="11" cy="11" r="7"/><path d="M21 21l-4-4"/></Ic>,
  Tv:      (p) => <Ic {...p}><rect x="3" y="5" width="18" height="13" rx="2"/><path d="M8 21h8M12 18v3"/></Ic>,
  Film:    (p) => <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 9h18M7 5v4M11 5v4M15 5v4M19 5v4M3 14h18"/></Ic>,
  Series:  (p) => <Ic {...p}><rect x="2" y="4" width="20" height="13" rx="2"/><path d="M8 21h8M12 17v4"/><path d="M7 8l4 2-4 2zM15 8l4 2-4 2z"/></Ic>,
  Download:(p) => <Ic {...p}><path d="M12 3v12"/><path d="M7 11l5 5 5-5"/><path d="M5 19h14"/></Ic>,
  Settings:(p) => <Ic {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.6 15a1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z"/></Ic>,
  Cast:    (p) => <Ic {...p}><path d="M3 17a4 4 0 014 4M3 13a8 8 0 018 8M3 9a12 12 0 0112 12"/><rect x="3" y="3" width="18" height="6" rx="1"/></Ic>,
  Play:    (p) => <Ic {...p} fill="currentColor" stroke="none"><path d="M8 5v14l11-7z"/></Ic>,
  PlayCircle: (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><path d="M10 8l6 4-6 4z" fill="currentColor" stroke="none"/></Ic>,
  Heart:   (p) => <Ic {...p}><path d="M12 21s-7-4.5-7-10.5C5 7 7.5 5 10 5c1.5 0 2.5 1 2 2.5C13 6 14.5 5 16 5c2.5 0 5 2 5 5.5 0 6-7 10.5-9 10.5z"/></Ic>,
  Plus:    (p) => <Ic {...p}><path d="M12 5v14M5 12h14"/></Ic>,
  Star:    (p) => <Ic {...p} fill="currentColor" stroke="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 22 12 18.27 5.82 22 7 14.14 2 9.27l6.91-1.01z"/></Ic>,
  ArrowBack: (p) => <Ic {...p}><path d="M19 12H5M12 19l-7-7 7-7"/></Ic>,
  ArrowRight: (p) => <Ic {...p}><path d="M5 12h14M12 5l7 7-7 7"/></Ic>,
  Trash:   (p) => <Ic {...p}><path d="M4 7h16M9 7V5a2 2 0 012-2h2a2 2 0 012 2v2m-7 0v13a2 2 0 002 2h6a2 2 0 002-2V7M10 11v6M14 11v6"/></Ic>,
  Pause:   (p) => <Ic {...p} fill="currentColor" stroke="none"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></Ic>,
  Link:    (p) => <Ic {...p}><path d="M10 13a5 5 0 007.07 0l3-3a5 5 0 00-7.07-7.07l-1.5 1.5"/><path d="M14 11a5 5 0 00-7.07 0l-3 3a5 5 0 007.07 7.07l1.5-1.5"/></Ic>,
  User:    (p) => <Ic {...p}><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0116 0"/></Ic>,
  File:    (p) => <Ic {...p}><path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6"/></Ic>,
  Grid:    (p) => <Ic {...p}><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></Ic>,
  Volume:  (p) => <Ic {...p}><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19 12a4 4 0 00-2-3.46M15.5 8.5a7 7 0 010 7"/></Ic>,
  Subtitles:(p) => <Ic {...p}><rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 15h2M11 15h6M7 11h4M13 11h4"/></Ic>,
  Info:    (p) => <Ic {...p}><circle cx="12" cy="12" r="10"/><path d="M12 8v.01M11 12h1v4h1"/></Ic>,
  Bookmark:(p) => <Ic {...p}><path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z"/></Ic>,
  Chevron: (p) => <Ic {...p}><path d="M9 18l6-6-6-6"/></Ic>,
  Close:   (p) => <Ic {...p}><path d="M18 6L6 18M6 6l12 12"/></Ic>,
  Timer:   (p) => <Ic {...p}><circle cx="12" cy="13" r="8"/><path d="M12 9v4l3 2M9 3h6"/></Ic>,
  Eq:      (p) => <Ic {...p}><path d="M4 21V11M4 7V3M12 21v-6M12 11V3M20 21v-4M20 13V3"/><path d="M2 11h4M10 15h4M18 17h4"/></Ic>,
};

window.Icons = Icons;
window.Ic = Ic;
