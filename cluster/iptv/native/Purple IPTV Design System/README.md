# Purple IPTV — Design System

> Brand DNA, tokens, and Android TV UI kit for the **Purple IPTV** streaming platform.

## What this is

Purple IPTV is a multi-region IPTV / VOD streaming service. Users connect via an **M3U / M3U8** link (or credentials / playlist file), then browse **Direct TV** (live channels), **Films** (VOD), and **Series** — with a 3-day free trial gated by an "ACTIVATE" CTA.

The existing app is a mobile product (iOS / Android, French + English). This design system **transposes that brand onto an Android TV / Fire TV / Google TV target**, built natively in **Kotlin + Jetpack Compose for TV** (TV LazyRows, TV LazyVerticalGrid, ImmersiveList).

The brand is unapologetically purple: a deep-violet near-black canvas, lavender as the singular accent, and movie/show artwork as the hero.

---

## Sources

- **Mobile app screenshots** — provided via the mounted folder `iptv_screens/` (12 JPEGs covering splash, home, library grid, detail, live player, settings/account, channel drawer, downloads). All have been copied into `source_screens/` in this project.
- **No codebase / Figma** was provided. The brand DNA below is reverse-engineered from screens. Where production strings or component implementations would normally be cited, this README marks them as **[inferred]**.

---

## Index — what's in this design system

```
purple-iptv-design-system/
├── README.md                  ← you are here
├── SKILL.md                   ← machine-readable invocation for Claude Code
├── colors_and_type.css        ← CSS vars: colors, type, radii, shadows, motion
├── assets/                    ← logo mark, wordmark, brand imagery
├── fonts/                     ← (Poppins is loaded via Google Fonts CDN — see CAVEATS)
├── source_screens/            ← original mobile screenshots (input material)
├── preview/                   ← Design-System-tab cards (do not edit by hand)
└── ui_kits/
    └── android_tv/            ← Android TV UI kit (hi-fi click-thru recreation)
        ├── index.html         ← runnable kit — home, detail, live, browse, login
        ├── README.md          ← kit map, component list, focus model
        └── *.jsx              ← per-component implementations
```

---

## Content Fundamentals

### Voice & tone
The app is **utilitarian and direct** — there is no marketing copy, no slogans, no winks at the user. It behaves like a remote control: tell me what's on, let me pick it, get out of the way.

- **Sentence case for descriptions and prompts** ("Connect to your IPTV service to access your favorite content.")
- **ALL CAPS for section headers and category labels** ("DOWNLOADED", "FRANCE SPORT", "EN DIRECT", "TAILLE", "COULEUR")
- **Title Case for screen titles and bottom-tab labels** ("Direct TV", "Films", "Series", "Downloads", "Settings & Account")
- **Buttons are short and verb-led, in ALL CAPS for primary CTAs** ("ACTIVATE", "CONNECT", "M3U LINK", "CREDENTIALS", "FILE") — secondary buttons use Title Case ("Play", "Download", "Cancel", "Sign out")
- **Pronouns:** "your" addresses the user directly ("your favorite content", "your local data will be kept on this device"). No "we" / "our" anywhere — the brand never refers to itself.
- **No emoji.** No exclamation marks. No icon-as-vibe. The only visual flourish is the brand mark itself.
- **Numbers stay numeric.** "3 day(s) remaining", "11747", "75 genres", "163". The "(s)" pluralization tell shows this is internationalized but not deeply copywritten — preserve that flavor in TV copy.

### Bilingual baseline (FR ⇄ EN)
The app is built FR + EN side-by-side. Every screen has both. Strings should be short enough that the French translation never wraps where the English doesn't. Examples seen:

| EN                       | FR                          |
|--------------------------|-----------------------------|
| Subtitle Style           | Style Sous-titres           |
| Tracks & Subtitles       | Pistes & Sous-titres        |
| Small / Medium / Large   | Petit / Moyen / Grand       |
| White / Yellow           | Blanc / Jaune               |
| Dark semi-transparent bg | Fond noir semi-transparent  |
| LIVE                     | EN DIRECT                   |
| Free trial: 3 day(s) remaining | Essai gratuit : 3 jour(s) restants [inferred] |

### Examples of in-app copy (verbatim from screenshots)
- "Connect to your IPTV service to access your favorite content."
- "3-day free trial included. Premium activation available after."
- "Free trial: 3 day(s) remaining."
- "All your local data will be kept on this device." (sign-out confirmation)
- "This is a subtitle preview" / "Ceci est un aperçu des sous-titres"

### Tone do's and don'ts

| ✅ Do                                             | ❌ Don't                                              |
|---------------------------------------------------|-------------------------------------------------------|
| "Connect to your IPTV service."                   | "Let's get you streaming! 🎬"                          |
| "3 day(s) remaining."                             | "Only 3 days left — don't miss out!"                  |
| "Sign out?"                                       | "Are you sure you want to leave us?"                  |
| ALL CAPS section labels                           | Title-case "Downloaded Episodes"                      |
| Outlined `ACTIVATE` pill                          | A gradient hero button shouting "GET PREMIUM"         |

---

## Visual Foundations

### Color — three layers, one accent

1. **Background layer** is deep blue-purple, near-black: `#14082A` (`--bg-1`). Surface elevation is a single step lighter `#1B0E36` (`--bg-2`); a focused / pressed row is one step lighter again `#251548` (`--bg-3`). No pure black anywhere except behind subtitle preview boxes and inside the video player.
2. **Brand layer** is a single vivid lavender: `#B36BFC` (`--purple-400`). It does **exactly three jobs**: paint primary CTAs, paint focus / selection state, paint the brand wordmark and logo highlights. It never appears in body copy, in icons that aren't selected, or in backgrounds of large panels.
3. **Accent layer** is the trial banner — a slightly washed-out lavender `#A66BFC` covering the very top of every mobile screen. This is the only piece of full-bleed brand color in the product. The TV port replaces it with a subtle top-strip notification.

### Type
- **Family:** geometric sans, working substitute = **Poppins** (loaded via Google Fonts). The original may be SF Pro Display / Roboto / a custom — flag for confirmation.
- **Weights in use:** 400 (body), 500 (chips, meta), 600 (UI labels), 700 (titles), 800 (hero, brand wordmark).
- **Casing rules** (above) drive almost as much of the visual identity as color does. The all-caps section labels in `--purple-300` with `letter-spacing: 0.14em` are a signature.
- **Tracking:** tight `-0.02em` on big headlines, loose `0.14em` on all-caps eyebrows. Body is neutral.
- **TV scale** is bumped: hero title 64px, h1 44px, body 22px. Floor is **22px** for any text on a TV screen.

### Backgrounds, imagery, motifs
- **No gradients** except (a) the trial banner top-strip and (b) the dark-to-transparent **protection gradient** at the bottom of hero artwork that lets title text float legibly over photography.
- **No patterns, no textures.** The brand is content-first. The only ornament is the logo mark.
- **Imagery is full-bleed and warm** — film posters, sports stills, channel flags. Color is whatever the source content delivers; the UI surrounds it with deep purple rather than competing with it.
- **No hand-drawn illustrations.** No mascots. The brand mark itself is the only illustrated artifact: a faceted **geometric mandala / crystal burst** in violet + yellow with a pink crystal heart at its center. It is mythic, premium, slightly mystical — not playful.

### Cards
- **Posters** (films, series): 2:3 aspect, `--radius-lg` (18px), a soft inner border at 4% white, a `--shadow-poster` underneath. **No padding** — artwork is full-bleed. A `★ rating` chip sits **bottom-left** with `--radius-sm`, lavender fill, white text. A heart **favorite icon** sits top-right, outlined white at 60% opacity (filled lavender when favorited).
- **Channel tiles** (Direct TV): square, `--radius-md`, the channel's flag or logo art full-bleed, a single-line label *below* the tile (not overlaid).
- **List rows** (Downloads, Episodes): `--bg-2` surface, `--radius-md`, 16px padding, action icons right-aligned in lavender circles for primary action and dimmed trash icon for destructive.

### Borders
- Default dividers: `1px solid rgba(255,255,255,0.08)` — barely there.
- **Focus / selected outlines** are the dominant border style: `2px solid var(--purple-400)` with `border-radius: var(--radius-md)`. On TV, this gets the additional `--focus-glow` shadow.
- Outlined CTAs (the white "ACTIVATE" pill, the "Download" secondary button) use `1.5px` borders matched to their text color.

### States (the UI states matrix)

| Element            | Unfocused / Default                                                      | Focused (TV / hover)                                                                                                       | Pressed                                                                            |
|--------------------|--------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------|
| **Primary CTA**    | Solid `--purple-400` fill, white label, `--radius-md`                    | Scale 1.06, `--focus-ring`, lift via `--shadow-md`                                                                          | Scale 0.98, fill darkens to `--purple-600`                                          |
| **Secondary CTA**  | Outlined `1.5px var(--purple-400)`, transparent fill                     | Scale 1.06, `--focus-ring`, fill becomes `rgba(179,107,252,0.12)`                                                          | Scale 0.98, fill `rgba(179,107,252,0.22)`                                            |
| **Card / poster**  | Default surface, `--shadow-poster`                                       | Scale 1.08, `--focus-glow`, 2px lavender outline at `--radius-lg`, sibling cards dim to 60% opacity                         | Scale 1.02, sibling cards stay dimmed                                                |
| **List row**       | `--bg-2`                                                                 | Background `--bg-3`, left edge gains a 3px `--purple-400` indicator bar, item icons brighten                                | Background `--bg-4`                                                                  |
| **Chip / pill**    | Surface `--bg-3`, text `--fg-1`                                           | Background `--purple-400`, text `--fg-on-primary`                                                                          | Background `--purple-600`                                                            |
| **Tab (bottom)**   | Icon `--fg-3`, label `--fg-3`                                            | Icon + label `--purple-400`, **+ 2px lavender underline / indicator bar** above icon (TV: pill behind icon)                | Same as focused, with quick 0.95 scale tap                                          |
| **Text input**     | `--bg-2`, `1px rgba(255,255,255,0.06)`, placeholder `--fg-3`             | `2px var(--purple-400)`, `--focus-glow`                                                                                     | n/a                                                                                  |
| **Toggle**         | Track `rgba(255,255,255,0.12)`, knob white                               | Track `--purple-400`, knob white, `--focus-ring`                                                                            | Track `--purple-600`                                                                 |

### Motion
- **All transitions are 120–200ms** with `cubic-bezier(0.22, 1, 0.36, 1)` ("ease-out-quint"). Fast and confident.
- **Page transitions** are 240ms crossfades. No slides, no parallax.
- **Focus on TV**: scale 1 → 1.08 + glow over 160ms. Nothing else moves. Dimming siblings happens in parallel.
- **No bounces, no springs, no skeletal placeholder shimmers**. Content fades in once decoded.
- **Hero rotation** (carousel auto-advance) is a slow 8s crossfade between artworks; never a slide.

### Transparency, blur, scrims
- The Settings sheet on mobile is **modal over a 60% black scrim with a 24px backdrop-blur**. TV inherits this for any dialog (e.g. activation, sign-out).
- The hero artwork carries a **bottom-up protection gradient** so the title and metadata sit legibly without a solid plate.
- The trial top-strip on mobile is **opaque**, never translucent — it owns the status bar zone.

### Corner radii
| Token        | Use                                                  |
|--------------|------------------------------------------------------|
| `--radius-xs` 6px   | Star/rating chip, toggle track                       |
| `--radius-sm` 10px  | Meta chips ("01:10:48", "★ 7.2"), tiny buttons       |
| `--radius-md` 14px  | Inputs, list rows, segmented buttons                 |
| `--radius-lg` 18px  | Posters, channel tiles, hero cards                   |
| `--radius-xl` 24px  | Sheets, modals, "Now playing" mini-player container  |
| `--radius-pill`     | Outlined `ACTIVATE` button, brand wordmark badge     |

### Iconography
See the **ICONOGRAPHY** section below.

---

## Iconography

The mobile product uses a **stroke-based, two-pixel, rounded-cap icon set** in the family of **Material Symbols (Outlined)** / **Lucide**. Icons live in the 24-30px range on mobile, render at 28-32px on TV.

**Observed icons from the screenshots:**
- Bottom-tab: `tv` (Direct TV), `local-movies / clapperboard` (Films), `desktop-windows / monitor` (Series), `file-download` (Downloads)
- Header chrome: `apps` / `grid-view` (layout toggle), `cast` (Chromecast), `settings` (gear), `menu / hamburger`, `search` (magnifier)
- Content: `heart` outline (favorite), `play-arrow` (filled triangle inside a lavender circle), `download` (downward arrow with underscore), `trash` outline (delete), `chevron-up/down/back`, `bookmark` (filled = saved genre)
- Status: `timer / stopwatch` (trial banner), `star` (filled, on rating chips), `live-tv` pulsing red dot
- Player: `tune / equalizer` (audio/subtitle settings), `cast`, `1×` (speed)
- Detail: `arrow-back`, `info` (●i circular)

### Iconography decisions for this system

- **Substitution:** since no icon SVGs were provided, this kit uses **Lucide** (matching stroke-2, rounded caps, mobile + TV friendly). Loaded via CDN. **Flag for the user**: if the production app uses Material Symbols specifically, point at the Material Symbols Outlined font and we'll swap in 5 minutes.
- **Filled vs outlined:** outlined is the default state. Filled is reserved for **selected** (bottom-tab active, favorite when added) and **action** (the `play` glyph inside a lavender circle).
- **Color in unfocused:** `--fg-3` (white at 55%). **In focused / selected:** `--purple-400`. **On lavender CTAs:** `--fg-on-primary`.
- **No emoji.** Anywhere. The two flag illustrations seen in the channel grid are *channel artwork* (provided by the playlist), not UI emoji.
- **No unicode chars** as icons (no ★ in copy beyond the rating chip's literal star icon; no ▶ in copy — the play button is the icon component, not a glyph).
- **The brand mark** is the only "illustration" allowed in chrome. It appears at small size (32px) next to the wordmark in the mobile header, and large (200–360px) on the splash. Treat it as a logo asset, not a decorative element to be sprinkled.

---

## CAVEATS — please review

1. **Font is a guess.** Poppins is loaded as the working substitute; the in-app font appears geometric and could equally well be SF Pro, Roboto, Gilroy, or Plus Jakarta Sans. **Please send a TTF or confirm the family name** and we'll wire it into `fonts/` and remove the Google Fonts import.
2. **Icons are a substitute set.** Lucide via CDN. If you'd like Material Symbols (more native-feeling on Android TV) or a custom set, point me at it.
3. **Logo extraction is a screenshot crop**, not a clean vector. `assets/logo_mark.png` and `assets/logo_wordmark.png` are the best crops I could make. **Send the original SVG / PNG with transparency** and they'll drop straight in.
4. **No codebase was attached.** All component shapes, focus behaviors, and spacing values were reconstructed by eye from 12 mobile screenshots — high-confidence but not pixel-exact. If you have the Compose code, attach it and I'll align to it.
5. **Several screen types are unknown** — there is no provided screen for a Series detail / season picker, a search results page, an activation / purchase flow, parental controls, or any kind of "Recently watched / Continue" row. The TV kit makes reasonable proposals for these; they should be reviewed.

---

## Iterate with me

This system is meant to be edited. Tell me which choices feel right and which feel off — colors that should shift warmer or cooler, type that should be lighter or chunkier, focus glows that should be subtler or louder — and I'll regenerate the cards and the UI kit against the new tokens.
