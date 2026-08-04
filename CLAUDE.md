# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Static internal-tools hub for optical stores (distributable to any shop), served via GitHub Pages
under the repository's own Pages URL. Pure HTML/CSS/JS — **no build step, no package
manager, no backend, no database**. The UI and all user-facing text are in **French**.

Store-specific identity (shop name, address, phone, e-mail, default cash float) is **not hardcoded**:
each shop fills it once via the hub's "⚙ Mon magasin" modal, and it is kept in a shared
`localStorage` profile (see "Shared store profile" below) that every tool reads.

Hard privacy constraint: **no user data ever leaves the browser**. No analytics, no trackers,
no cookies, no network calls with user input. The only external resource is the Manrope webfont
via Google Fonts. Exports (PDF, clipboard) are generated entirely client-side. Preserve this
when adding or editing tools.

## Architecture

- `index.html` (root) — the hub landing page. Each tool is one `<article class="tool-card">`
  inside `<div id="tools-grid">`. Styled by `assets/css/hub.css`.
- `assets/css/hub.css` — styles for the hub page **only**. Defines the design tokens
  (`--blue #1F6FB2`, `--blue-d`, `--ink`, `--bg`, `--border`, `--green`, `--radius`, `--shadow`).
- `outils/<tool-name>/index.html` — each tool is a **single self-contained file**: inline
  `<style>` and inline `<script>`, no shared JS/CSS imports, no third-party libraries. Tools
  re-declare the color variables locally in their own `:root` rather than importing hub.css.

Client-side patterns used by existing tools (reuse these instead of pulling in dependencies):
- **PDF export** = `window.print()` plus an `@media print` stylesheet (no jsPDF/CDN).
- **Gmail copy** = `navigator.clipboard.write([new ClipboardItem(...)])` with a `text/html`
  blob, falling back gracefully on unsupported browsers (see `demande-ordonnance`).
- **Persistence** = `localStorage` with a per-tool key (see `LS_CAISSE` in `cloture-caisse`).

### Shared store profile

Store identity is held in **one shared `localStorage` key**, `profil-magasin-v1`, written only by
the hub's "Mon magasin" modal (`index.html`) and **read** by every tool. Shape (all optional):

```json
{ "nom": "Optique du Centre", "adresse": "…", "tel": "04…", "mail": "…@votremagasin.fr", "fond": 53.80 }
```

Because all pages share the same GitHub Pages origin, they share this key. Conventions:
- `nom` is the **full** shop name as the user typed it (e.g. `"Optique du Centre"`). Never
  hardcode any brand name; display `nom` as-is, falling back to a neutral label
  (`"Mon magasin"` in tools, `"Outils internes"` on the hub) when unset.
- Tools must **read** the profile and degrade gracefully when unset (never hardcode a shop's name,
  phone, e-mail, or cash float). Reader pattern: a small `profil()`/`loadProfil()` helper that
  `JSON.parse`s the key inside a try/catch. See `storeName()`/`storeMeta()` in `demande-ordonnance`
  and `fondDefaut()`/`storeSubtitle()` in `cloture-caisse`.
- `localStorage` is per browser/device, so profiles never leak between shops — and do not sync
  between two machines of the same shop unless the optional Drive sync below is configured.

**Optional Drive sync** (still no project backend): the hub can mirror the profile to the shop's own
Google Drive via a user-deployed **Apps Script web app**. The shop pastes the script's `…/exec` URL
(stored under `sync-url-v1`); the hub reads/writes the profile through it using **JSONP**
(a `<script>` tag with `?action=load|save&data=…&callback=…`) to sidestep Apps Script CORS limits.
Setup procedure + the script live in `docs/sync-drive/`. Only the store profile is synced — never
patient data.

All links and asset paths must be **relative** — the site lives under the repository's GitHub Pages
subpath (e.g. `/<repo-name>/`). Every tool includes a `← Retour` link pointing to `../../`.
`.nojekyll` disables Jekyll processing so the raw static files are served as-is.

## Adding a new tool

1. Create `outils/<tool-name>/index.html` (self-contained HTML + inline CSS + inline JS).
2. Add a matching `<article class="tool-card">` to the grid in the root `index.html`.
3. Reuse the existing color tokens for visual consistency.
4. Add the `← Retour` link to `../../` at the top of the tool.
5. Keep all data client-side (see privacy constraint above).
6. **Make it responsive** — tools must be usable on smartphones (the staff use them on
   mobile). Include `<meta name="viewport" content="width=device-width, initial-scale=1.0">`
   and `@media (max-width: 640px)` rules so layouts stack/shrink on small screens.
7. **Sticky `.app-bar` — the single navigation component.** Every tool opens with the same
   header, copied verbatim (the "one tool = one self-contained file" rule forces duplication;
   it does **not** licence divergence). It carries three things: the exit (`← Tous les outils`,
   that exact wording everywhere), the tool name, and a `<details>` switcher listing the other
   tools with `aria-current="page"` on the current one — so moving between two tools no longer
   requires a round trip through the hub.

   ```html
   <header class="app-bar">
     <a class="app-bar__back" href="../../">&#8592; Tous les outils</a>
     <span class="app-bar__title">Nom de l'outil</span>
     <details class="app-bar__switch" id="tool-switch">
       <summary aria-label="Changer d'outil">Outils</summary>
       <nav class="app-bar__menu" aria-label="Autres outils">
         <span aria-current="page">Nom de l'outil</span>
         <!-- les autres outils en liens relatifs ../<outil>/ -->
       </nav>
     </details>
   </header>
   ```

   Rules that came out of the navigation audit and must not be undone:
   - `position: sticky` — the exit stays on screen after scrolling, **on Android as well as
     iOS**. This is what replaced the old floating pill.
   - `@media (max-height: 480px) { .app-bar { position: static; } }` — a sticky header plus a
     fixed action bar would eat the whole viewport in landscape or at 200% zoom.
   - Navigation targets are `min-height: 48px`.
   - Hide `.app-bar` in `@media print`.
   - **Never sniff the user-agent to decide navigation.** The previous `/iPad|iPhone|iPod/`
     test removed the header link on *any* Apple device, including iPhone Safari where the
     browser back button exists — replacing a useful control with a pill that covered the
     form. If a control must depend on standalone mode, test the *situation*:
     `window.navigator.standalone === true || matchMedia('(display-mode: standalone)').matches`.
   - The exit calls `history.back()` when `document.referrer` is the hub, so returning
     restores the hub's scroll position instead of pushing a new entry. The `href` stays
     valid for direct entry, no-JS, and open-in-new-tab.

8. **Drafts: the exit must not destroy work.** Any tool with more than a couple of fields
   persists to its own `brouillon-<outil>-v1` key on every input (debounced 400 ms), plus on
   `visibilitychange`/`pagehide` — the only events iOS reliably fires before suspending. It
   restores on load and *says so* via a visible note. No `beforeunload`: it is ignored in
   standalone mode on iOS and covers neither sleep nor an incoming call. Existing keys
   (`profil-magasin-v1`, `cloture-caisse-v1`, …) are never renamed or reused.

9. **`env(safe-area-inset-*)` only means something with `viewport-fit=cover`.** Without it the
   viewport defaults to `contain`: the layout is already inset inside the safe area and every
   `env(safe-area-inset-*)` resolves to `0`. That is the current, safe state — do not add
   `viewport-fit=cover` without then re-checking every fixed element in landscape on a notched
   device, where `safe-area-inset-left` becomes non-zero.

## Local checks (mirror CI — there are no app tests)

CI runs on every push to `main` and every PR; reproduce locally before pushing:

```sh
# HTML validation (rules in .htmlvalidate.json) — version pinned to match CI
npx --yes html-validate@11.5.6 "**/*.html"

# File hygiene — all must produce no output:
git grep -nIP ' +$' -- ':!*.md'   # no trailing whitespace (Markdown exempt)
git grep -lIP '\r$' -- .          # no CRLF (LF only)
# plus: every non-binary file must end with a final newline
```

Other CI jobs: `actionlint` (workflow linting), `lychee` (link checking), CodeQL (embedded JS),
and `gitleaks` (secret detection). `.editorconfig` enforces UTF-8, LF, 2-space indent, trimmed
trailing whitespace (except `.md`), and a final newline.

## Conventions

- **Commits**: prefix `HF-XXX — <short description in French>` (e.g.
  `HF-003 — outil Demande/Ordonnance : structure et styles`). `HF` = "Hub Facilities",
  a brand-neutral tag (no registered trademark in the repo).
- **Deploy**: pushing to `main` triggers `.github/workflows/deploy.yml`, which publishes to
  GitHub Pages. Do not hand-build or push to a `gh-pages` branch.
- Dependabot updates GitHub Action versions weekly.
