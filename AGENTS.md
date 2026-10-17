# AGENTS.md

## Project Overview

FocusRing is a Pomodoro-style focus timer built with vanilla HTML, CSS, and JavaScript. No build step, no dependencies, no bundler. Open `index.html` directly in a browser or use VS Code Live Server for auto-reload.

## Running the App

```bash
# Just open index.html in a browser, or:
npx serve .        # any static server works
# VS Code "Live Server" extension recommended for development
```

```bash
npm test           # unit tests, Node's built-in runner -- nothing to install
```

There is no linter or formatter configured. `package.json` exists only to run the tests; the app itself has no dependencies.

## Architecture

Single-page app in three files loaded synchronously:

- **`index.html`** — Markup only. All DOM elements referenced by ID from script.js.
- **`style.css`** — Loaded via `<link>` in head. Defines all theme colors as CSS custom properties on `:root`.
- **`script.js`** — Wrapped in an IIFE `(function(){ ... })();`. All state and logic are module-scoped (no globals leak). Loaded at bottom of body.

### Timer State Machine

The core logic in `script.js` follows this pattern:

- **Modes**: `WORK`, `BREAK`, `LONG` (defined in `MODE` const)
- **Cycle tracking**: `cycleIndex` (0–3) counts completed work sessions; when it hits 4, the next break becomes `LONG` then resets to 0
- **Timer**: Uses `setInterval(tick, 1000)` — not drift-corrected. `tick()` decrements `remaining` and calls `renderAll()` each second
- **Rendering**: Single `renderAll()` function updates time display, progress ring SVG stroke offset, button labels, seed dots, and theme. Called after every state change
- **Theme switching**: `applyTheme()` sets `--accent` and `--accent-dark` CSS custom properties on `document.documentElement.style`, which cascades everywhere
- **Audio**: `playChime()` uses Web Audio API (AudioContext) to synthesize two sine tones. Fails silently if unavailable

### SVG Progress Ring

The circular dial uses `stroke-dasharray` / `stroke-dashoffset` on an SVG circle (r=112, circumference ≈ 703.7). The SVG is rotated -90deg via CSS so progress starts at 12 o'clock. Offset calculation: `CIRCUMFERENCE * (1 - remaining/totalSeconds)`.

### Editable Durations

Duration inputs (`#workInput`, `#breakInput`, `#longInput`) are only enabled when the timer is stopped. The `.edit-row.visible` class controls opacity/max-height transition. Changing an input only updates the current mode's duration if that mode matches the active input.

## Conventions

- **CSS custom properties** for all colors — never hardcode color values outside `:root`
- **Fonts**: Zilla Slab (serif) for time display, Work Sans (sans-serif) for everything else. Loaded from Google Fonts
- **Accessibility**: `aria-label` on inputs, `aria-hidden` on decorative seeds, `focus-visible` outlines on buttons, `prefers-reduced-motion` media query disables transitions
- **No external dependencies** — audio is synthesized, icons are CSS shapes, fonts are the only external resource

## Gotchas

- The entire JS codebase is inside an IIFE. Adding new functionality must go inside the closure or you'll create global variables
- Timer uses `setInterval` without drift correction. Long-running sessions will accumulate timing error. If fixing this, switch to storing a target timestamp and computing remaining from `Date.now()`
- `cycleIndex` and `completedWork` track similar but distinct concepts. `completedWork` increments per work session; `cycleIndex` tracks position within the 4-session cycle and resets on long break
- Duration inputs only update `totalSeconds`/`remaining` when the changed input matches the current mode. Editing the break duration while in work mode has no immediate effect
- The seed dots (`.seed`) always show exactly 4 elements. They fill based on `cycleIndex`, not `completedWork`
- `playChime()` creates a new AudioContext on every call. Browsers may limit concurrent contexts

## Data layer and tests

The app is split into three layers; keep new code in the right one:

- **`js/stats.js`, `js/badges.js`, `js/util.js`** -- pure logic (streaks, totals, ring geometry, badge rules). No DOM, no storage, and anything time-dependent takes a `now` argument. This is what the tests cover.
- **`js/localRepo.js`** -- the async data interface (`getProfile`, `saveProfile`, `getSettings`, `patchSettings`, `getAppearance`, `saveAppearance`, `getJourney`, `recordSession`), built on `localStorage`. **`js/repo.js`** is the single place that picks the implementation, so a hosted backend replaces one line there.
- **UI modules** (`timer`, `journey`, `profile`, `panel`, `themes`, `alerts`, `sharecard`) -- only ever import `repo`; they never touch `localStorage` directly.

Gotchas:

- Every repo method is async and resolves to plain data. UI `init*` functions are async too and are started together from `main.js` with `Promise.allSettled`, so one failing doesn't stop the rest.
- The `focusring_*` storage keys are kept exactly as they were before the repo existed, so saved profiles, history and settings carry over. `tests/localRepo.test.js` has tests that preload those legacy keys -- keep them passing.
- Tests live in `tests/*.test.js`. `tests/memoryStore.js` is a helper, not a test (the runner only picks up `*.test.js`). `tests/stats.test.js` sets `TZ=America/New_York` so the daylight-saving cases mean something wherever they run.
- The DOM modules aren't unit-tested; check UI changes in a browser.
