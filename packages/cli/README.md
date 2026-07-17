# @bart-ui/cli

Scaffold **Bart** — a portable, shadcn-style AI assistant for React — into your
project. Like shadcn/ui, the CLI copies the source into your repo: you own and
can edit every file, and there is **no runtime npm dependency on bart-ui**.

```bash
npx @bart-ui/cli init
# or
bunx @bart-ui/cli init
```

## What you get

- A streaming chat UI in three variants — dock, sidebar, spotlight — as thin
  shells over one shared headless core, plus shadcn-style composable parts
  (`BartProvider`, `BartHeader`, `BartMessages`, `BartInput`, …).
- Markdown-based site knowledge, safe page navigation, element highlighting,
  and opt-in element clicking — every tool gated by per-tool policies
  (`auto` / `confirm` / `disabled`) enforced in the headless core.
- A Fetch-standard `Request → Response` server handler
  (`createBartHandler`) with request hardening built in. LLM calls always go
  through your server; API keys stay in server-side environment variables.

## What `init` does

1. Copies the bart-ui source into your repo (default `src/bart`, change with
   `--dir`).
2. Writes `.bart.json` — paths, provider choice, and install-time file hashes
   (used by the future `bart update`).
3. Adds bart-ui's runtime dependencies (`ai`, `@ai-sdk/react`, `react-markdown`,
   `remark-gfm`, `zod`) — and, if you pick a provider, the matching
   `@ai-sdk/openai` / `@ai-sdk/anthropic` / `@ai-sdk/google` adapter — to your
   `package.json`. Versions you already declare are never overwritten. It does
   not run the install; it tells you the command to run.

If you skip the provider (`--yes` and non-interactive runs default to `none`),
init prints the pinned install command for each adapter. Use those ranges:
the templates run `ai@^5`, which pairs with the `^2` adapter majors —
installing an adapter at `latest` targets a newer `ai` major and throws
`AI_UnsupportedModelVersionError` at runtime.

### Options

| Flag | Meaning |
| --- | --- |
| `--dir <path>` | Where to copy the source (default `src/bart`) |
| `--provider <name>` | `openai` \| `anthropic` \| `google` \| `none` (default: prompt; `none` when non-interactive) |
| `-y`, `--yes` | Accept defaults, never prompt |
| `--force` | Overwrite an existing `.bart.json` / non-empty `--dir` |

## Requirements

- React 19 (React DOM), TypeScript 5+ in the consuming project
- Node ≥ 20 to run the CLI (`bunx` works too)
- A server route where you can mount a Fetch-standard handler (Next.js route
  handlers, Hono, Remix/React Router resource routes, …). Plain Vite SPAs can
  use the bundled Node bridge (`./bart/server/node`) as dev-server middleware —
  see the repo README for the snippet.
- Tailwind is **not** required: `styles.css` is plain CSS. Tailwind v4 users
  can additionally import `./bart/tailwind.css` for `bg-bart-*` utilities.

## After init

```ts
// 1. once, e.g. in your root layout / main.tsx
import "./bart/styles.css";

// 2. render the assistant
import { BartChat } from "./bart";

// 3. mount the handler on your API route
import { createBartHandler } from "./bart/server";
```

Full docs, the manifest format, and examples:
<https://github.com/tuann72/bart-ui#readme>

## Roadmap

`bart add <variant>`, `bart sync` (markdown → context manifests),
`bart doctor`, and `bart update` (content-hash-aware) are planned but not yet
available.

## License

MIT
