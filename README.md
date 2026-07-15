# Bart

A portable, shadcn-style React assistant you scaffold into your own codebase.
Bart gives a website a streaming chat helper that knows the site's content
(from markdown), can navigate between pages, and can highlight elements on the
page — with the LLM key kept strictly server-side.

Bart is provider-agnostic: the registry depends only on the Vercel AI SDK, and
a provider adapter is chosen server-side by the consumer. The planned V1
provider choices are OpenAI, Anthropic (Claude), and Google Generative AI
(Gemini).

Consumers will eventually install it with `bunx @bart-ui/cli init` (or
`npx @bart-ui/cli init`) and own every copied source file. This repository
contains the source registry, the development playground, and (soon) the CLI.

## Repository layout

| Path | What it is |
| --- | --- |
| `registry/` | `@bart-ui/registry` — the source templates consumers receive: headless chat core, the three UI variants, theming tokens, and the server handler |
| `apps/playground/` | Blank-page Vite app + Hono mock API for developing and visually testing Bart without an API key |
| `AGENTS.md` | Project context for LLM agents (architecture invariants, conventions, gotchas) |

## Getting started

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
- **Select any page text** — an "Ask Bart" popup appears above the selection;
  clicking it opens the assistant with the selection attached as a removable
  pill. Select again to attach multiple items before asking; this works in the
  dock, sidebar, and spotlight variants.
- Use Markdown in a message, or ask the model for a table, list, blockquote, or
  code sample — both sides of the conversation render GitHub-flavored
  Markdown with raw HTML disabled.
- Switch variants in the header: **dock** (bottom tab → chat panel slides up),
  **sidebar** (edge tab → full-height panel that pushes the page aside on
  desktop; header has new-chat and close buttons), **spotlight** (press `/`
  for a glass command-palette-style prompt; Esc closes).
- In the dock, drag its upper inside corner to resize it upward and inward.
  The handle also supports arrow keys when focused.
- Toggle dark mode; all Bart surfaces re-theme through CSS tokens.

## Development

```bash
bun test              # unit tests (validators, ranking, shortcut logic)
bun run typecheck     # registry + playground TypeScript
```

### How it fits together

- `registry/src/core/use-bart-chat.ts` is the headless core (built on the
  Vercel AI SDK's `useChat`). It owns transport, streaming, and **all** tool
  security: route allowlisting, target validation, approval policies, and
  per-turn navigation caps. The three variant components in
  `registry/src/components/` are thin shells over it.
- `registry/src/server/index.ts` exports `createBartHandler`, a Fetch-standard
  `Request -> Response` handler with schema validation, origin checks, size and
  duration limits, and delimited site context. The playground mounts it on
  Hono; Next.js can use it directly.
- Theming lives in `registry/src/styles.css`: set `--bart-primary`,
  `--bart-accent` (and their `-foreground` pairs) to rebrand every variant,
  with separate `.dark` values.

### Consumer content and environment contract

The future `bart init` command defines the consumer project root as the
directory containing the selected `package.json` (or the directory passed with
`--cwd`) and writes that location to `.bart.json`. Relative Bart paths resolve
from that root so monorepos do not depend on whichever directory starts the
server.

- Markdown belongs in `<project-root>/content/bart` by default. The path is
  configurable through `.bart.json`. Initialization creates the directory and
  a valid example document, while `bart sync` and `bart doctor` print the
  resolved absolute path when content is missing or invalid.
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
variants, theming, server handler) and the visual-testing playground with unit
tests. Not yet built: the `@bart-ui/cli` initializer, markdown ingestion
(`bart sync`), framework adapters and example apps, provider factories,
durable rate limiting, and the full Playwright/Testing Library suites.
