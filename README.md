# bart-ui

`bart-ui` is a portable, shadcn-style React assistant toolkit that you scaffold
into your own repository. The included assistant is named Bart and provides
streaming chat, markdown-based site knowledge, safe page navigation, element
highlighting, and opt-in button clicking. Your application owns the source,
server route, model, and API key.

## Try the playground

Requires [Bun](https://bun.com) 1.3+.

```bash
bun install
```

### Offline mock

```bash
bun run playground
```

Open <http://localhost:5173>. Vite serves both the site and the deterministic
mock API at `/api/bart`; no key, second process, or port 8787 is needed.

### Gemini

Add a key to the repository-root `.env`:

```bash
cp .env.example .env
```

Then set:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Start the Gemini playground with one command:

```bash
bun run scripts/dev-real.ts
```

Open <http://localhost:5173>. The launcher mounts Gemini at `/api/bart` in the
same Vite process. Do **not** also run `bun run playground`; that command starts
the offline mock instead.

To choose a model explicitly:

```bash
bun run scripts/dev-real.ts --model gemini-3.1-flash-lite
```

The launcher temporarily makes `@ai-sdk/google` available, generates the
ignored `apps/playground/server/gemini.local.ts`, and keeps provider-specific
artifacts out of committed manifests. `Ctrl-C` stops the site and API together.

## Install bart-ui in an app

### 1. Scaffold

```bash
npx @bart-ui/cli init --provider google
# or: bunx @bart-ui/cli init --provider google
```

The CLI copies the bart-ui source into `src/bart`, writes `.bart.json`, and
adds the required AI SDK v5 dependencies without replacing ranges already in
your project. Run your package manager's install command afterward.

The templates use `ai@^5` and the `^2` provider adapters. Keep those paired;
installing a newer adapter major can cause `AI_UnsupportedModelVersionError`.

### 2. Render the assistant

```tsx
import "./bart/styles.css";
import { BartChat } from "./bart";
import { publicManifest } from "./manifest";

<BartChat
  api="/api/bart"
  currentRoute={pathname}
  navigate={(route) => router.push(route)}
  manifest={publicManifest}
/>;
```

`styles.css` is plain CSS; Tailwind is optional. Tailwind v4 users can also
import `./bart/tailwind.css` for token-backed utilities.

### 3. Define site knowledge

Until `bart sync` ships, create two TypeScript manifests:

- A public manifest with routes and target IDs, safe for the browser.
- A server manifest containing the markdown bodies, imported only by the API.

```ts
// src/manifest.ts — browser-safe
import type { BartPublicManifest } from "./bart";

export const publicManifest: BartPublicManifest = {
  routes: [
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and combos",
      targets: [
        { id: "combo-deals", description: "Combo deals section" },
        {
          id: "start-order",
          description: "Start pickup order button",
          interactive: true,
        },
      ],
    },
  ],
};
```

```ts
// src/manifest.server.ts — server-only
import type { BartServerManifest } from "./bart/server";

export const serverManifest: BartServerManifest = {
  documents: [
    {
      route: "/pricing",
      title: "Pricing",
      description: "Plans and combos",
      keywords: ["price", "combo"],
      targets: [
        { id: "combo-deals", description: "Combo deals section" },
        {
          id: "start-order",
          description: "Start pickup order button",
          interactive: true,
        },
      ],
      body: "## Pricing\nThe Smoke Show costs $12.",
    },
  ],
};
```

Match targets in the page markup:

```tsx
<section data-bart-target="combo-deals">...</section>
```

Highlighting requires a registered target. Clicking additionally requires
`interactive: true`, user confirmation by default, and a native enabled
button-like element; Bart never clicks links or text inputs.

### 4. Add the server route

`createBartHandler` is a Fetch-standard `Request → Response` handler. Provider
credentials and model selection stay server-side.

#### Next.js App Router

```ts
// app/api/bart/route.ts
import { google } from "@ai-sdk/google";
import { createBartHandler } from "@/bart/server";
import { serverManifest } from "@/manifest.server";

export const POST = createBartHandler({
  model: google("gemini-flash-lite-latest"),
  manifest: serverManifest,
});
```

#### Vite development

Vite SPAs have no server routes, so mount bart-ui as development middleware with
the included Node bridge:

```ts
// src/bart-api.ts — server-only; never import from browser code
import { google } from "@ai-sdk/google";
import { createBartHandler } from "./bart/server";
import { toNodeHandler } from "./bart/server/node";
import { serverManifest } from "./manifest.server";

export const handler = toNodeHandler(
  createBartHandler({
    model: google("gemini-flash-lite-latest"),
    manifest: serverManifest,
  }),
);
```

```ts
// vite.config.ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    react(),
    {
      name: "bart-api",
      configureServer(server) {
        server.middlewares.use("/api/bart", async (req, res, next) => {
          try {
            const { handler } = await server.ssrLoadModule("/src/bart-api.ts");
            handler(req, res);
          } catch (error) {
            next(error);
          }
        });
      },
    },
  ],
});
```

This keeps local development on one origin and port. For production, deploy
the same Fetch handler through your framework route, a Vercel Function, a
Cloudflare Worker/Pages Function, or a Node server via `toNodeHandler`. You do
not need to manage a separate public port.

Set the key only in the server environment:

```dotenv
GOOGLE_GENERATIVE_AI_API_KEY=your_key_here
```

Never use a browser-exposed `VITE_` or `NEXT_PUBLIC_` prefix for provider keys.

### Provider reference

| Provider | Adapter | Environment variable | Suggested model |
| --- | --- | --- | --- |
| Gemini | `@ai-sdk/google@^2` | `GOOGLE_GENERATIVE_AI_API_KEY` | `gemini-flash-lite-latest` |
| OpenAI | `@ai-sdk/openai@^2` | `OPENAI_API_KEY` | `gpt-4o-mini` |
| Anthropic | `@ai-sdk/anthropic@^2` | `ANTHROPIC_API_KEY` | `claude-haiku-4-5` |

Prefer rolling aliases when available because dated model IDs can retire.

## Configure the UI

Required props are `api`, `currentRoute`, `navigate`, and `manifest`.

| Prop | Default | Purpose |
| --- | --- | --- |
| `variant` | `"dock"` | `"dock"`, `"sidebar"`, or `"spotlight"` |
| `appearance` | `"default"` | Opaque surface or `"glass"` |
| `title` | `"Bart"` | Launcher, header, and accessible name |
| `icon` | Bart mark | Custom brand node |
| `side` | `"right"` | Dock/sidebar edge |
| `launcher` | `"tab"` | Sidebar `"tab"` or `"button"` |
| `shortcutKey` | `"/"` | Spotlight shortcut |
| `selectionAsk` | `true` | Offer Bart for selected page text |
| `toolPolicy` | safe defaults | Per-tool `auto`, `confirm`, or `disabled` |

Tool defaults are highlight `auto`, navigate `confirm`, and interact `confirm`.
The auto-approve control can skip confirmation but never re-enable a disabled
tool. Colors, radius, surfaces, and glass tint use `--bart-*` CSS tokens with
separate `.dark` values.

For custom composition, use `<BartProvider>` with `BartDock`, `BartSidebar`, or
`BartSpotlight` and the exported header, body, messages, input, and action
parts. Presentation can be rearranged without changing core tool enforcement.

## Develop this repository

```bash
bun run typecheck    # registry, CLI, and playground TypeScript
bun test             # 151 unit and component-contract tests
bun run test:e2e     # 8 Chromium flows; starts Vite automatically
bun run cli:build    # rebuild CLI output and bundled templates
```

Streaming failures are masked in the UI and logged server-side. During local
debugging, `createBartHandler({ onError })` may return a development-only
message; keep the masked default in production.

Repository layout:

| Path | Purpose |
| --- | --- |
| `registry/` | Source templates: core, UI shells, styles, server handler |
| `packages/cli/` | `@bart-ui/cli` initializer and bundled templates |
| `apps/playground/` | Vite playground, mock model, manifests, browser tests |
| `scripts/dev-real.ts` | Uncommitted real-provider smoke-test launcher |

## Status

Implemented: registry, dock/sidebar/spotlight variants, composable parts,
selection-to-chat, hardened server handler, Node bridge, `bart init`, mock and
real-provider playground paths, unit/component tests, and Playwright tests.

Planned: `bart add`, `sync`, `doctor`, and `update`; generated markdown
manifests; framework adapters/examples; provider factories; durable rate
limiting.
