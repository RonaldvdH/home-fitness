# AGENTS.md — 5kg Dumbbell Circuit Studio

Instructions and engineering guidelines for AI coding agents and human contributors working in this repository.

## 1. Project Overview & Tech Stack

**5kg Dumbbell Circuit Studio** is a client-side interval workout trainer featuring a 60 FPS articulated SVG exercise demonstrator, Web Audio interval cues, a customizable circuit routine builder, and persistent state (`localStorage` with optional Firebase Auth + Firestore cloud sync).

- **Package Manager**: `pnpm` (do not use `npm` or `yarn` lockfiles)
- **Bundler / Dev Server**: Vite (`vite.config.js`)
- **Styling**: Tailwind CSS v4 (`@tailwindcss/vite`) + custom CSS in `src/styles/main.css`
- **Language**: Vanilla ES Modules (`"type": "module"`)
- **Cloud Persistence (Optional)**: `firebase` (`firebase/app`, `firebase/auth`, `firebase/firestore`)
- **Testing**: Vitest (`tests/*.test.js`)

## 2. Common Commands

```bash
pnpm install        # Install dependencies
pnpm dev            # Start Vite dev server
pnpm build          # Production build to dist/
pnpm preview        # Preview production build
pnpm test           # Run unit tests once (vitest run)
pnpm test:watch     # Run unit tests in watch mode
```

## 3. Project Structure & Separation of Concerns

Keep modules strictly organized by responsibility:

```text
├── index.html                  # Semantic HTML shell & SVG stage markup (no inline JS/CSS)
├── vite.config.js              # Vite + Tailwind v4 plugin configuration
├── src/
│   ├── main.js                 # App bootstrap, dependency wiring, top-level event bindings
│   ├── styles/
│   │   └── main.css            # Tailwind v4 entry, @theme tokens, custom scrollbar & stage spotlights
│   ├── data/
│   │   └── exercises.js        # Pure static data: DEFAULT_EXERCISES, WARMUP_ITEM, COOLDOWN_ITEM
│   ├── state/
│   │   └── store.js            # APP_STATE, STORAGE_KEYS, DEFAULT_SETTINGS, localStorage load/save
│   ├── engine/
│   │   ├── timeline.js         # Pure timeline builder, duration calculation, MM:SS formatting
│   │   ├── timer.js            # Interval timer controller & workout session logging
│   │   └── kinematics.js       # 60 FPS requestAnimationFrame SVG pose engine & math helpers
│   ├── services/
│   │   ├── audio.js            # Web Audio API beep synthesizer
│   │   └── persistence.js      # Optional Firebase Auth/Firestore sync + localStorage fallback
│   └── ui/
│       ├── dom.js              # Shared DOM helpers (escapeHTML, showToast, openModal, closeModal)
│       ├── stageView.js        # Active step, progress ring, instructions, transport button UI
│       ├── routineView.js      # Sidebar exercise list rendering & delegated click handling
│       ├── historyView.js      # Completed sessions list & sync status badge UI
│       └── modals.js           # Add/Edit Exercise, Settings, Cloud/History, JSON Import/Export
└── tests/
    ├── timeline.test.js        # Unit tests for timeline & formatting
    └── kinematics.test.js      # Unit tests for easing & cue math
```

## 4. Architectural Guidelines & Conventions

1. **No Inline Scripts or Styles in `index.html`**:
   - Keep `index.html` purely structural. All styles belong in `src/styles/main.css` and all logic belongs in `src/`.
2. **No Global `window.*` Handlers or Inline `onclick=` Attributes**:
   - Use `addEventListener` and event delegation (`data-action` attributes, as in `src/ui/routineView.js`).
3. **Keep Domain Logic Pure & Testable**:
   - `src/engine/timeline.js`, `src/data/exercises.js`, and the math helpers in `src/engine/kinematics.js` must remain free of DOM (`document`/`window`) dependencies so they can run directly in Vitest.
4. **Preserve Offline-First Persistence**:
   - The app must work out of the box with zero backend configuration. Firebase in `src/services/persistence.js` is activated only when `window.__firebase_config` is defined; `localStorage` is always updated first.
5. **Sanitize Dynamic HTML**:
   - Always pass user-supplied strings (exercise names, muscle groups, steps, dates) through `escapeHTML()` from `src/ui/dom.js` before interpolating into `innerHTML`.
6. **Adding a New 60 FPS Exercise Animation**:
   - Add the new `case '<animation-key>':` pose interpolation in `KINEMATICS_ENGINE.renderFrame()` (`src/engine/kinematics.js`).
   - Add the corresponding `<option value="<animation-key>">` to `#field-ex-anim` in `index.html`.
   - Optionally add a preset entry in `src/data/exercises.js`.

## 5. Verification Checklist Before Finishing Changes

- Run `pnpm test` and ensure all unit tests pass.
- Run `pnpm build` and ensure Vite bundles cleanly with zero errors.
- If UI or DOM IDs changed, verify that every `document.getElementById(...)` in `src/ui/` and `src/engine/kinematics.js` still matches `index.html`.
