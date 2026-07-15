# AGENTS.md — LLM context for Bart

Bart is a portable, shadcn-style React LLM assistant. Consumers scaffold it into
their own repository (`bunx @bart-ui/cli init` / `npx @bart-ui/cli init`) and own
the source afterwards; there is no runtime npm dependency on Bart. It provides a
streaming chat UI, markdown-based site knowledge, safe page navigation, and
element highlighting. LLM requests always pass through consumer-owned server
code; API keys live only in environment variables.

## Current state

Implemented and verified:

- `registry/` — the source templates consumers will receive: headless core,
  three UI variants, theming tokens, and the Fetch-standard server handler.
- "Ask about selection": selecting page text shows an "Ask Bart" popover;
  clicking it opens the active variant with the selection attached as a
  dismissible pill. Up to eight unique selections can be attached in every
  variant and are sent as markdown blockquotes before the question.
- Motion: CSS keyframes only, no animation library (0.45s expo-out both
  ways). Panels slide in/out; the launcher tabs animate back in on close so
  the panel reads as shrinking into the tab; the sidebar pushes page content
  aside through body margin classes with a matching transition; the spotlight
  fades/scales in, vertically centered; the selection popover fades and lifts
  in, and fades back out when the selection is lost. `prefers-reduced-motion`
  disables all Bart animation (`core/motion.ts` also skips the exit-animation
  state). Anything with an exit animation follows one pattern: `motionDisabled()`
  unmounts immediately, otherwise a `closing` flag flips a `data-state` attribute
  and `onAnimationEnd` does the unmount — never a `setTimeout` duplicating the
  CSS duration in JS.
- Iconography: shared SVG icons in `components/icons.tsx` (circular Bart
  mark, close, send, stop, check, refresh) — no emoji glyphs in Bart UI. The
  send/stop control is a round icon button inside the combined input shell.
- User and assistant messages render safe GitHub-flavored Markdown through
  `react-markdown` and `remark-gfm`; raw HTML is disabled. Thinking states
  rotate playful filler labels alongside the dots.
- The dock resizes from its upper inside corner, capped at 32rem wide and
  `min(52rem, 92dvh)` tall; its mobile layout remains fixed.
- `apps/playground/` — a fictional Stackhouse Burger Co. site with Home,
  Pricing, and FAQ routes for visual and grounded-context testing, plus a Hono
  API server running a scripted mock model (offline, deterministic, no API
  key). No provider adapter is installed anywhere in the repository. This app
  doubles as the future Playwright host.
- Unit tests (`bun test`, 37 passing) for shortcut suppression, route/target
  validation, and context selection.

Planned but NOT yet built: the `@bart-ui/cli` package (`init`, `add <variant>`,
`sync`, `doctor`, `update`), markdown ingestion via `gray-matter` (manifests are
currently hand-written in the playground), Next.js/React Router adapters and
example apps, provider factories (OpenAI/Anthropic/Google),
durable rate limiting, React Testing Library + Playwright suites.

## Workspace layout

Bun workspace (Bun 1.3, **isolated installs**: dependencies resolve from each
package's `node_modules`, symlinked into the root `.bun` store — nothing is
hoisted to root `node_modules`).

- `registry/` = `@bart-ui/registry` (private, source-only; exports `.`,
  `./server`, `./styles.css` pointing at TypeScript source, not builds)
  - `src/core/` — `use-bart-chat.ts` (headless core over AI SDK `useChat`),
    `tool-policy.ts` (route/target allowlisting + policy resolution),
    `highlight.ts` (overlay + aria-live), `shortcut.ts` (spotlight `/` key
    suppression logic, DOM-free for testability), `selection.ts` (quote
    normalization/capping + blockquote building, DOM-free), `focus-trap.ts`,
    `types.ts`
  - `src/components/` — `bart-chat.tsx` (variant switch; owns the shared
    `open` state and the selection popover), `dock.tsx`, `sidebar.tsx`,
    `spotlight.tsx` (all controlled via `open`/`onOpenChange`),
    `selection-popover.tsx`, `chat-parts.tsx` (MessageList/ChatInput/
    approval cards/selected-text pills shared by all shells)
  - `src/server/` — `index.ts` (`createBartHandler`), `context.ts`
    (deterministic lexical selection under a character budget)
  - `src/styles.css` — `--bart-*` theming tokens + all component styling
- `apps/playground/` — Vite React app (port 5173, proxies `/api` → 8787);
  `server/` holds the Hono app, scripted mock model, and server manifest
  (port 8787)

## Commands

From the repo root:

- `bun install` — install everything
- `bun test` — unit tests
- `bun run typecheck` — `tsc -p registry && tsc -b apps/playground`
- `bun run playground:server` — Hono mock API on :8787
- `bun run playground` — Vite dev server on :5173 (run both for visual testing)

## Conventions and hygiene rules

- Bun only: `bun add`/`bun remove` for dependencies (never hand-edit versions),
  `bun test`, `bunx`. Never commit npm/pnpm/Yarn lockfiles alongside `bun.lock`.
- Bootstrap new packages/apps with official initializers (`bun init`,
  `bun create vite`, `bunx shadcn@latest init`); don't fabricate foundational
  config from scratch. Inspect generated files before making targeted edits.
- The playground intentionally uses Vite (not `Bun.serve` HTML imports): it
  must mirror what real consumers run.
- Pinned stack: AI SDK v5 (`ai@^5`, `@ai-sdk/react@^2`), `zod@^4`,
  `react-markdown@^10`, `remark-gfm@^4`, Tailwind v4, Hono v4, React 19.
  Verify API shapes against `node_modules` types rather than assuming.
- Registry code must satisfy the playground's strict tsconfig (it is
  typechecked through the app's `tsc -b`): `noUnusedLocals`,
  `verbatimModuleSyntax`, `noUncheckedIndexedAccess`.
- Semantic `bart-*` CSS classes live in `registry/src/styles.css`; theming goes
  through the `--bart-primary` / `--bart-accent` (+ `-foreground`) tokens, which
  are also mapped into Tailwind via `@theme inline`. Both light and `.dark`
  values are required; shipped defaults must hold WCAG AA contrast.

## Gotchas

- **Never import `ai/test` in running server code.** Its entry point requires
  vitest and msw at runtime. The playground mock model is a plain
  `LanguageModelV2` object streaming through `simulateReadableStream`.
- Isolated installs mean type packages must be declared where they're used
  (e.g. `@ai-sdk/provider` is a devDependency of the playground for the mock
  model's types).
- The Vite proxy makes the browser origin (`localhost:5173`) differ from the
  API origin (`localhost:8787`), so the playground passes `allowedOrigins`
  explicitly; `createBartHandler` defaults to same-origin otherwise.
- Tailwind cannot auto-detect the symlinked registry package; the playground's
  `index.css` declares `@source "../../../registry/src"`.
- **`.bart-glass` carries no `border` and no `box-shadow` on purpose.** Pairing
  either with `backdrop-filter` on the same element leaves a pale unfiltered
  band around the whole inside perimeter — the blur visibly stops short of the
  edge. The band is fixed-width and unaffected by blur radius, border alpha,
  corner radius, or shadow geometry, so it does not look like it comes from
  those properties; only removing both clears it. An edge or drop shadow has to
  live on a wrapper element instead, so no element has both them and the filter.
- The playground `<BartChat key={variant}>` remounts on variant switch, so the
  conversation resets — intentional for the playground.

## Architecture invariants (do not weaken)

1. **Source ownership**: runtime component code is never imported from the CLI
   package; templates are bundled inside the versioned CLI and copied into the
   consumer repo. No remote template downloads at init time.
2. **Headless core owns security**: all tool-policy enforcement (approval
   prompts, route allowlisting, target validation, per-turn navigation caps)
   lives in `useBartChat`/`tool-policy.ts`, never in variant shells. The
   spotlight's minimal chrome gets no reduced security behavior.
3. **Server-side secrets**: provider credentials and model selection are fixed
   server-side and cannot be overridden by browser requests. `system` is a
   server-side option appended to a non-removable security preamble; system
   prompts are never accepted from the browser (the request schema rejects the
   `system` role).
4. **Navigation**: only exact routes from the generated manifest; schemes,
   hosts, protocol-relative URLs, and unknown routes are rejected; navigate
   defaults to `confirm`, executes through the injected router callback (never
   `window.location`), and is capped per assistant turn.
5. **Highlighting**: only registered target ids resolved via
   `data-bart-target` attributes; arbitrary model-generated CSS selectors are
   never accepted; overlay is non-layout-shifting, announced via aria-live,
   auto-cleaned.
6. **Context is data, not instructions**: markdown is delimited in
   `<bart-context>` tags and the base system prompt says embedded instructions
   must be ignored and cannot expand tool permissions.
7. **Request hardening**: schema validation, limits on body size / message
   count / message length / output tokens / tool steps / duration, origin
   validation, `authorize(request)` hook, abort on client disconnect
   (`AbortSignal.any` with a timeout). Don't log API keys, full prompts, or
   message bodies.
8. **Tool policies** are `auto` | `confirm` | `disabled` per tool. Defaults:
   highlight `auto`, navigate `confirm`.
9. **Spotlight shortcut** (`/`, remappable) must never fire inside inputs,
   textareas, selects, contenteditable, during IME composition, or with
   modifiers; Escape closes and restores focus.
10. **Selection popup** (`selectionAsk`, default on, opt-out prop) must never
    trigger for text selected inside Bart's own UI — every Bart surface
    carries `data-bart-ui` and the popover checks the selection's ancestors.
    Selections are whitespace-collapsed, deduplicated, capped at 600 chars
    each, and limited to eight pending pills. Dock, sidebar, and spotlight must
    all render and remove items through the shared headless state/composer.
11. **Environment boundary**: the project root is the configured consumer
    workspace directory containing `.bart.json`. Markdown defaults to
    `<project-root>/content/bart`; provider secrets load server-side from the
    root `.env` (`.env.local` may override). Client code never reads secrets or
    uses `VITE_`/`NEXT_PUBLIC_` provider-key variables.
12. **Provider neutrality**: no provider adapter (`@ai-sdk/openai`,
    `@ai-sdk/anthropic`, `@ai-sdk/google`, …) is a dependency of any package in
    this repository, including the playground. The registry's model integration
    depends only on `ai`, `@ai-sdk/react`, and `zod`; its UI additionally uses
    provider-neutral Markdown renderers. Models arrive through the `model`
    option of `createBartHandler`. Provider adapters are installed by the
    future CLI into the *consumer's* project, based on the provider they
    select. The playground runs the scripted mock model only. If a
    real-provider smoke test is ever needed, it belongs behind a separate,
    uncommitted local setup — never in the committed dependency tree.
13. **Distribution allowlist**: consumer installs include only the runtime
    files declared by the selected registry items and their declared consumer
    dependencies. Never bundle `apps/`, `*.test.*`, fixtures, screenshots,
    local environment files, root development manifests, or playground-only
    provider adapters into CLI templates. Use a package `files` allowlist when
    the CLI package is created; do not rely on a blacklist alone.

## Markdown context system (spec for `bart sync`)

Content lives in `<project-root>/content/bart` by default (configurable in
`.bart.json`) with required
front matter `title`, `description`, `route` (unique, relative; external URLs
rejected) and optional `keywords`, `targets` (ids unique per route). Sync
generates a **public manifest** (routes, descriptions, target ids — safe for
the browser) and a **server-only manifest** (markdown bodies). The server
validates the client-reported current route, always includes that page first,
then adds documents by deterministic lexical score under a character budget
(default 40,000 chars ≈ 10k tokens), truncating deterministically. A
server-executed `search_content` tool retrieves further excerpts. Vector
retrieval is deliberately out of V1 scope.

## Testing strategy

- Pure logic (validators, ranking, budgeting, shortcut suppression) → `bun
  test`, no DOM or network. Test files sit next to sources (`*.test.ts`).
- Component behavior (approval flows, streaming states, focus) → React Testing
  Library (not yet set up).
- Full flows → Playwright against the playground with the mock model, covering
  all three variants and the `/` shortcut edge cases (not yet set up; a manual
  Playwright script was used for initial verification).
- Screenshot-based visual regression only once the design stabilizes.
- The mock model exercises the same handler/transport/streaming/approval paths
  as real providers; provider-specific behavior belongs in a mocked-provider
  unit suite.

## Key decisions (and why)

- shadcn-style copied source over an npm runtime dependency: consumers must be
  able to edit everything; updates flow through content-hash-aware `bart
  update` (install-time hashes recorded in `.bart.json`).
- Next.js App Router + React Router/Vite-with-Hono as the two V1 targets; the
  Fetch-standard `Request -> Response` handler is the portable contract.
- Three UI variants (dock, sidebar, spotlight) as thin shells over one shared
  headless core; `bart init` installs one, `bart add <variant>` adds others.
- V1 provider choices are OpenAI, Anthropic (Claude), and Google Generative AI
  (Gemini). The CLI installs only the adapter required by the selected
  provider/model and keeps its key in the project-root server environment.
- In-memory token-bucket rate limiter for dev with a durable `RateLimiter`
  interface (arbitrary string key; defaults to client IP honoring
  trusted-proxy rules) and a prominent warning when the in-memory limiter runs
  in production. A durable store is not mandatory — zero-external-service
  setup is a core goal.
- Session-only chat history in V1; storage callbacks exist for consumers, but
  no databases, auth systems, analytics, or transcript retention.
- Deferred: vector retrieval, remote content ingestion, persistent history,
  attachments, voice, arbitrary selectors, tools with irreversible external
  side effects.
