# Android TV UI Kit — Purple IPTV

Hi-fi, click-thru recreation of the Purple IPTV streaming experience, targeted at **Android TV / Fire TV / Google TV** (1920×1080). Built to be navigated entirely by D-pad — `←` `→` `↑` `↓` `Enter` `Esc`.

## Screens included
- **Splash / Connect** — logo, M3U / Credentials / File tabs, 3-day trial CTA
- **Home** — immersive hero banner that cross-fades, plus four content rows (Continue Watching, Trending Films, Live TV, Top Series)
- **Movie Detail** — hero artwork, metadata chips, Play / Download / + My List
- **Direct TV** — genre grouped channel grid (FRANCE SPORT, AFRIQUE, ALBANIA…)
- **Live Player** — fullscreen video, LIVE chip, info overlay, subtitle/audio tray
- **Search** — genre list + results grid
- **Settings & Account** — Language, Subtitle Style, Sign out (modal sheet pattern)

## Components (`./*.jsx`)
- `SideRail.jsx` — collapsible left navigation (Netflix/Prime style); expands on focus
- `TopChrome.jsx` — brand mark + wordmark + global actions (search, cast, settings)
- `HeroBanner.jsx` — full-bleed cinematic hero with protection gradient + meta
- `ContentRow.jsx` — TV LazyRow analog (D-pad horizontal scroll)
- `PosterCard.jsx` — 2:3 poster with rating, favorite, focus glow
- `ChannelTile.jsx` — square live-channel tile with focus state
- `MovieDetail.jsx` — full detail screen
- `LivePlayer.jsx` — player chrome
- `SettingsSheet.jsx` — modal-over-blur for settings + account
- `SearchScreen.jsx` — genre list + grid

## Focus model

Focus is the central UI state. Every focusable element:
- scales `1.04`–`1.08` based on the element class
- gains a `2px` lavender outline (`--purple-400`)
- gains a `0–24–64px` lavender glow
- dims its **focused siblings** to 0.5 opacity, saturation 0.7

Page-level focus is tracked in a `focused` ref on the root. The side rail expands when any item in it is focused; collapses when focus leaves.

## Known gaps
- No real video playback — the LivePlayer screen shows a tinted still
- No Series → Season → Episode chooser screen (the source app's flow wasn't provided)
- No account / billing screens beyond the simple Sign-out confirm
