# Bart

A portable, shadcn-style React assistant you scaffold into your own codebase.
Bart gives a website a streaming chat helper that knows the site's content
(from markdown), can navigate between pages, can highlight elements on the
page, and can click buttons the site explicitly opts in — with the LLM key
kept strictly server-side.

Bart is provider-agnostic: the registry depends only on the Vercel AI SDK, and
a provider adapter is chosen server-side by the consumer. The planned V1
provider choices are OpenAI, Anthropic (Claude), and Google Generative AI
(Gemini).

Consumers install it with `npx @bart-ui/cli init` (or `bunx @bart-ui/cli init`)
and own every copied source file. This repository contains the source registry,
the development playground, and the CLI.

## Use Bart in your app

### 1. Scaffold

```bash
npx @bart-ui/cli init --provider google   # or openai / anthropic / none
```

This copies the Bart source into `src/bart` (change with `--dir`), writes
`.bart.json`, and adds the runtime dependencies — `ai@^5`, `@ai-sdk/react`,
`react-markdown`, `remark-gfm`, `zod`, plus the chosen provider adapter — to
your `package.json` (never overwriting ranges you already declare). Run your
package manager's install afterwards.

> **Adapter versions matter.** The templates use `ai@^5`, which pairs with the
> `^2` majors of `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google`.
> Installing an adapter at `latest` targets a newer `ai` major and throws
> `AI_UnsupportedModelVersionError` at runtime — use the ranges the CLI adds
> (e.g. `npm install "@ai-sdk/google@^2"`).

### 2. Render the UI

```tsx
import "./bart/styles.css"; // once, e.g. in your root layout / main.tsx
import { BartChat } from "./bart";

<BartChat
  api="/api/bart"
  currentRoute={pathname}
  navigate={(route) => router.push(route)}
  manifest={publicManifest}
/>;
```

`styles.css` is plain CSS — Tailwind is **not** required. If your app uses
Tailwind v4 and you want utilities like `bg-bart-primary`, additionally import
`./bart/tailwind.css`.

### 3. Write your manifests

Until `bart sync` (markdown ingestion) ships, both manifests are hand-written
TypeScript. The **public manifest** is browser-safe and drives navigation /
highlighting; the **server manifest** adds the markdown bodies the model reads
and must only be imported server-side.

```ts
// src/manifest.ts — safe to ship to the browser
import type { BartPublicManifest } from "./bart";

export const publicManifest: BartPublicManifest = {
  routes: [
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and combos",
      targets: [
        { id: "combo-deals", description: "The combo deals section" },
        { id: "start-order", description: "Start pickup order button", interactive: true },
      ],
    },
  ],
};
```

```ts
// server-only (e.g. src/manifest.server.ts) — contains content bodies
import type { BartServerManifest } from "./bart/server";

export const serverManifest: BartServerManifest = {
  documents: [
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and combos",
      keywords: ["price", "combo"],
      targets: [{ id: "combo-deals", description: "The combo deals section" }],
      body: "## Pricing\nThe Smoke Show costs $12. Combo deals exist…",
    },
  ],
};
```

Elements referenced as targets carry a matching `data-bart-target="combo-deals"`
attribute in your JSX. A complete example pair lives in
`apps/playground/src/manifest.ts` and `apps/playground/server/manifest.ts`.

### 4. Mount the server handler

`createBartHandler` returns a Fetch-standard `Request → Response` function;
your LLM key stays in server-side env vars.

**Next.js** (route handler, `app/api/bart/route.ts`):

```ts
import { google } from "@ai-sdk/google";
import { createBartHandler } from "@/bart/server";
import { serverManifest } from "@/manifest.server";

export const POST = createBartHandler({
  model: google("gemini-flash-latest"),
  manifest: serverManifest,
});
```

**Vite (SPA)** — Vite has no server routes, so mount the handler as dev-server
middleware with the bundled Node bridge (`./bart/server/node`):

```ts
// vite.config.ts
import { defineConfig, type ViteDevServer } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bart-api",
      configureServer(server: ViteDevServer) {
        server.middlewares.use("/api/bart", async (req, res) => {
          // ssrLoadModule transpiles TS and hot-reloads the handler in dev.
          const { handler } = await server.ssrLoadModule("/src/bart-api.ts");
          handler(req, res);
        });
      },
    },
  ],
});
```

```ts
// src/bart-api.ts — server-only module, never imported by client code
import { google } from "@ai-sdk/google";
import { createBartHandler } from "./bart/server";
import { toNodeHandler } from "./bart/server/node";
import { serverManifest } from "./manifest.server";

export const handler = toNodeHandler(
  createBartHandler({
    model: google("gemini-flash-latest"),
    manifest: serverManifest,
  }),
);
```

The API key must be present in the *server* process environment
(`GOOGLE_GENERATIVE_AI_API_KEY=… npm run dev`, or load your `.env` in
`vite.config.ts` with `dotenv`) — never in a `VITE_`-prefixed variable. In
production a SPA needs a real host for the handler: any Node server via
`toNodeHandler`, a serverless function, or a small Bun/Hono service (below).

**Bun + Hono** (what this repo's playground does):

```ts
import { Hono } from "hono";
import { google } from "@ai-sdk/google";
import { createBartHandler } from "./bart/server";
import { serverManifest } from "./manifest.server";

const bart = createBartHandler({
  model: google("gemini-flash-latest"),
  manifest: serverManifest,
  // Only needed when the API runs on a different origin than the page:
  allowedOrigins: ["http://localhost:5173"],
});

const app = new Hono();
app.post("/api/bart", (c) => bart(c.req.raw));
export default { port: 8787, fetch: app.fetch };
```

### 5. Pick a provider and model

| Provider | Adapter (pinned) | Env var | Suggested model id |
| --- | --- | --- | --- |
| Google (Gemini) | `@ai-sdk/google@^2` | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-flash-latest` |
| OpenAI | `@ai-sdk/openai@^2` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `@ai-sdk/anthropic@^2` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |

Prefer rolling aliases (like `gemini-flash-latest` /
`gemini-flash-lite-latest`) over dated ids — dated ids retire and start
returning 404s for new API keys.

### Debugging server errors

Streaming errors are masked to the client as “An error occurred.” by default,
and the real cause is logged server-side via `console.error`. To surface more
during development, pass `onError` to `createBartHandler`:

```ts
createBartHandler({
  model,
  manifest,
  onError: (error) =>
    process.env.NODE_ENV !== "production"
      ? String(error) // shown in the chat UI's error banner
      : undefined,    // keep the masked default in production
});
```

## Repository layout

| Path | What it is |
| --- | --- |
| `registry/` | `@bart-ui/registry` — the source templates consumers receive: headless chat core, the three UI variants, theming tokens, and the server handler |
| `packages/cli/` | `@bart-ui/cli` — the `npx @bart-ui/cli init` scaffolder; bundles the registry as templates at build time |
| `apps/playground/` | Blank-page Vite app + Hono mock API for developing and visually testing Bart without an API key |
| `AGENTS.md` | Project context for LLM agents (architecture invariants, conventions, gotchas) |

## Developing this repo

Prerequisite: [Bun](https://bun.com) 1.3+.

```bash
bun install

# terminal 1 — mock API (Hono, port 8787)
bun run playground:server

# terminal 2 — web app (Vite, port 5173)
bun run playground
```

Open <http://localhost:5173>. The playground is a fictional three-page burger
site (Home, Pricing, FAQ) with a scripted mock model — deterministic, offline,
no API key required. No provider adapter is installed anywhere in this
repository, so development and automated tests cannot incur provider charges.
The mock exercises the same handler, transport, streaming, and approval paths a
real provider would.

Things to try:

- Ask **“how much is the Smoke Show?”** — streams a Markdown answer grounded in
  the mock restaurant menu.
- Ask **“take me to the FAQ”** — the model calls the `navigate` tool; you get
  an Allow/Deny confirmation card (navigation defaults to `confirm`).
- Ask **“highlight the combo deals”** on the Pricing page — the `highlight`
  tool pulses an overlay around the registered section (defaults to `auto`).
- Ask **“start a pickup order”** on the Pricing page — the `interact` tool
  asks for approval, then clicks the page's own **Start pickup order** button
  (only buttons flagged `interactive: true` in the manifest are clickable;
  defaults to `confirm`).
- **Select any page text** — an "Ask Bart" popup appears above the selection;
  clicking it opens the assistant with the selection attached as a removable
  pill. Select again to attach multiple items before asking; this works in the
  dock, sidebar, and spotlight variants.
- Use Markdown in a message, or ask the model for a table, list, blockquote, or
  code sample — both sides of the conversation render GitHub-flavored
  Markdown with raw HTML disabled.
- Switch variants in the header: **dock** (bottom tab → chat panel slides up),
  **sidebar** (full-height panel that pushes the page aside on desktop),
  **spotlight** (press `/` for a command-palette-style prompt; Esc or a click
  outside fades it away).
- Every variant can start a fresh conversation: the dock and sidebar headers
  have a new-chat button next to close, and the spotlight keeps its actions in
  the bottom-right corner of the card.
- Every variant also has an auto-approve switch (next to the lightning bolt in
  the dock/sidebar header, labelled **Auto-approve** in the spotlight's
  corner). Flip it on and Bart navigates, highlights, and clicks without
  asking first;
  it only skips the confirmation card — tools a consumer disabled by policy
  stay disabled.
- Switch the appearance in the header: **default** is a solid surface (white
  in light mode, tunable through `--bart-surface`), **glass** is a saturated
  backdrop blur with a diagonal sheen, tunable through the `--bart-glass` and
  `--bart-glass-sheen` tokens. For glass, the page's background must sit on
  `<body>` or `<html>` — the sidebar pushes `<body>` aside, so a background on
  an inner wrapper leaves nothing behind the panel for the blur to pick up.
- The dock and sidebar take a `side` of `"right"` (default) or `"left"`, and
  mirror themselves accordingly — including which edges they resize from.
- The sidebar launcher is switchable with `launcher`: `"tab"` (default, a
  vertical edge tab) or `"button"` (a floating pill in the bottom corner).
- Resize the dock from any of its two free edges: the inside corner for both
  axes at once, the top bar for height, the inside bar for width. The sidebar
  resizes its width from a full-height bar on the edge facing the page, and the
  page's content reflows with it.
- Resize handles draw nothing — hover an edge and the cursor turns into a resize
  arrow, which it keeps for the whole drag. Tab to a handle and it becomes
  visible; arrow keys resize from there (Shift for bigger steps).
- Close any variant and keyboard focus goes back where you started: the dock and
  sidebar return it to their launcher, the spotlight to whatever was focused
  before it opened.
- Toggle dark mode; all Bart surfaces re-theme through CSS tokens.

## Development

```bash
bun test              # unit tests + a per-variant component contract suite
bun run test:e2e      # Playwright suite (starts or reuses both playground servers)
bun run typecheck     # registry + cli + playground TypeScript
bun run cli:build     # bundle the CLI + snapshot the registry into templates/
```

The contract suite runs one table of behavioral assertions — open/close,
focus restore, streaming, errors, tool approvals, new chat — against all
three variants in happy-dom, so a capability added to one shell fails the
suite until every shell has it.

### Local real-provider smoke test (optional)

Development and CI use the offline mock — no key, no cost. To occasionally
sanity-check Bart against a real model, add a key to a repo-root `.env` (copy
`.env.example`) and run one command:

```bash
bun run scripts/dev-real.ts                    # Gemini (default)
bun run scripts/dev-real.ts --provider openai  # or openai / anthropic
```

The launcher installs the chosen provider adapter locally, generates the
`apps/playground/server/*.local.ts` server, and starts the real API (:8787)
plus Vite (:5173) together; Ctrl-C stops both. Everything it produces is
**uncommitted** — the adapter never enters `package.json`/`bun.lock` (the
manifests are restored after install) and the generated `*.local.ts` is
gitignored — so the repository stays provider-neutral (invariant 12). The
launcher itself imports no adapter and favors no provider. Verify with
`curl http://127.0.0.1:8787/api/health`.

### How it fits together

- `registry/src/core/use-bart-chat.ts` is the headless core (built on the
  Vercel AI SDK's `useChat`). It owns transport, streaming, and **all** tool
  security: route allowlisting, target validation, approval policies, and
  per-turn navigation caps. `BartProvider` (`components/bart-provider.tsx`) runs
  that core and owns the panel's open state, exposing both through
  `useBartContext`. The three variant shells and the composable parts read from
  that context — sharing one lifecycle hook for open/close animation, Escape,
  and focus restore — so security lives in exactly one place regardless of how
  the UI is composed.
- `registry/src/server/index.ts` exports `createBartHandler`, a Fetch-standard
  `Request -> Response` handler with schema validation, origin checks, size and
  duration limits, and delimited site context. The playground mounts it on
  Hono; Next.js can use it directly.
- Theming lives in `registry/src/styles.css`: set `--bart-primary`,
  `--bart-accent` (and their `-foreground` pairs) to rebrand every variant,
  with separate `.dark` values.

### Composition

`<BartChat>` is the batteries-included default: pick a `variant` and it renders
a `BartProvider`, one shell, and the selection popover. For more control, drop
`variant` and compose the pieces yourself (shadcn-style — you own the source):

```tsx
<BartProvider api="/api/bart" currentRoute={route} navigate={navigate} manifest={manifest}>
  <BartDock>
    <BartHeader>
      <BartTitle />
      <BartActions>
        <AutoApproveButton />
        <NewChatButton />
        <CloseButton />
      </BartActions>
    </BartHeader>
    <BartBody />
  </BartDock>
</BartProvider>
```

Every part (`BartHeader`, `BartActions`, `BartTitle`, `BartBody`,
`BartMessages`, `BartInput`, `NewChatButton`, `AutoApproveButton`,
`CloseButton`) reads shared state from `useBartContext`, so you can drop,
reorder, or wrap them freely. `BartDock`/`BartSidebar` render
`<BartHeader/>` + `<BartBody/>` when given no children. These are presentation
only — tool security stays in the core, so recomposing the UI never changes
what is enforced.

### Configuration

Everything below is a prop on `<BartChat>` (or `<BartProvider>` for the
chat/appearance options; the shell layout props — `variant`, `side`,
`launcher`, `header`, `inputSeparator`, `shortcutKey` — live on `<BartChat>` or
the individual shells). Required: `api`, `currentRoute`, `navigate`, and
`manifest`.

| Prop | Default | What it does |
| --- | --- | --- |
| `variant` | `"dock"` | `"dock"`, `"sidebar"`, or `"spotlight"` |
| `appearance` | `"default"` | `"default"` is an opaque surface (white in light mode); `"glass"` is the backdrop-blur look |
| `title` | `"Bart"` | The shell's display name: launcher and header text, aria labels, the "Ask …" popup |
| `icon` | Bart ring mark | Any React node rendered next to the title — launcher, header, spotlight hint, and selection popup |
| `side` | `"right"` | Which screen edge the dock/sidebar occupies |
| `launcher` | `"tab"` | Sidebar launcher: `"tab"` (vertical edge tab) or `"button"` (floating pill) |
| `header` | standard header | Dock/sidebar only. `false` removes the header (Escape still closes); any node replaces it wholesale |
| `inputSeparator` | `true` | Dock/sidebar only. `false` removes the line between the conversation and the input row |
| `shortcutKey` | `"/"` | Spotlight open key |
| `selectionAsk` | `true` | Show the "Ask Bart" popup over selected page text |
| `toolPolicy` | navigate `confirm`, highlight `auto`, interact `confirm` | Per-tool `"auto"` / `"confirm"` / `"disabled"`; the in-UI auto-approve switch can skip `confirm`, never re-enable `disabled` |
| `maxNavigationsPerTurn` | `2` | Navigation cap per assistant turn, clamped to 0–10 |
| `maxInteractionsPerTurn` | `3` | Click cap per assistant turn, clamped to 0–10 |
| `maxPendingSelections` | `8` | Attached selection pills, clamped to 1–8 |

Colors, radius, and the glass tint are not props but CSS tokens in
`registry/src/styles.css` (`--bart-primary`, `--bart-accent`,
`--bart-surface`, `--bart-radius`, `--bart-glass`, …), each with a separate
`.dark` value.

### Consumer content and environment contract

`bart init` defines the consumer project root as the directory containing the
`package.json` it runs beside and writes `.bart.json` there. Relative Bart
paths resolve from that root so monorepos do not depend on whichever directory
starts the server.

- Markdown will belong in `<project-root>/content/bart` by default (recorded
  in `.bart.json` today; the directory, example document, and ingestion arrive
  with `bart sync`/`bart doctor`). Until then, manifests are hand-written —
  see "Write your manifests" above.
- Provider secrets belong in `<project-root>/.env`; `.env.local` may override
  them for local development. Initialization creates `.env.example`, never a
  real secret file.
- Only generated server code reads provider environment variables. The React
  component does not read `.env`, and provider keys must never use a
  client-exposed prefix such as `VITE_` or `NEXT_PUBLIC_`.
- The Next.js adapter relies on Next.js environment loading. The Hono adapter
  loads from the configured project root when its runtime does not do so
  automatically. Production deployments must set the same variable in the
  hosting platform's server-side environment.

### Conventions

- Bun everywhere: `bun add`/`bun remove` for dependencies, `bun test` for
  tests. Don't hand-edit dependency versions or mix package managers.
- The stack is AI SDK v5, zod v4, Tailwind v4, Hono v4, React 19.
- Before working in this repo with an LLM agent, read `AGENTS.md` — it lists
  the architecture invariants (security rules) that must not be weakened, plus
  known gotchas.

## Status

Early development. Implemented: the registry (core, dock/sidebar/spotlight
variants, theming, hardened server handler, Node http bridge), the
`@bart-ui/cli` initializer (`bart init`), and the visual-testing playground,
with unit tests, a per-variant component contract suite, and a Playwright
browser suite against the playground. Not yet built: `bart add` / `bart sync`
(markdown ingestion) / `bart doctor` / `bart update`, example apps, provider
factories, and durable rate limiting.
