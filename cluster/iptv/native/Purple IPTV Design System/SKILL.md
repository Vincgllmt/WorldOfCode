---
name: purple-iptv-design
description: Use this skill to generate well-branded interfaces and assets for Purple IPTV (mobile, Android TV, marketing) — production code or throwaway prototypes/mocks. Contains the brand's color system, type rules, fonts, logo assets, voice/tone guide, and a hi-fi Android TV UI kit (Compose-friendly component reference).
user-invocable: true
---

Read the `README.md` file within this skill, and explore the other available files.

## What's in the skill folder

- `README.md` — brand DNA write-up: content fundamentals, visual foundations, iconography, caveats
- `colors_and_type.css` — design tokens as CSS vars (colors, type, radii, shadows, motion, TV safe area)
- `assets/` — logo mark + wordmark (cropped from app splash)
- `source_screens/` — original mobile screenshots used as reference material
- `preview/` — design-system cards (one HTML per token group / component state cluster)
- `ui_kits/android_tv/` — hi-fi click-thru recreation of the Android TV experience (React + Compose-friendly component breakdown). Open `index.html`; pass `?screen=home|directtv|liveplayer|settings|connect` to load specific screens.

## How to use

- **Visual artifacts (slides, mocks, throwaway prototypes):** copy the assets you need out of `assets/`, import `colors_and_type.css`, and reference the existing `preview/` cards for canonical patterns. Build static HTML for the user to view.
- **Production code (Compose for TV / Kotlin / web):** the TV kit's component breakdown in `ui_kits/android_tv/README.md` is the source of truth for layout, focus states, and motion. Translate the tokens in `colors_and_type.css` into your platform's theme system (e.g. `MaterialTheme.colorScheme` extensions, `LocalContentColor`).
- **Brand-correct copy:** always check the Voice section of the README before writing copy. The brand is direct, utilitarian, bilingual (FR + EN), no emoji, no marketing-speak, ALL CAPS section labels.

## When invoked without other guidance

Ask the user what they want to build or design (a slide, a mock-up of a new screen, a print piece, a production component, etc.), ask a few focused questions, then act as an expert designer producing HTML artifacts or production code as appropriate.

## Hard rules

- **Brand color is purple.** Lavender (`--purple-400` `#B36BFC`) is the only accent. It paints CTAs, focus, and the brand mark — never large backgrounds.
- **Backgrounds are deep blue-violet, near-black.** Never use white surfaces.
- **No emoji, no marketing exclamations, no gradient backgrounds for content surfaces.** The trial banner is the only gradient allowed.
- **TV designs always show a focus state.** Scale, ring, glow. Without focus visibility the design is broken.
- **TV body text floor is 22px.** Captions never below 16px.
- **Bilingual: FR + EN.** If the user gives only one, ask for the other before shipping.
