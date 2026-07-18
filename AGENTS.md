# AGENTS.md — bart-ui contributor context

`bart-ui` is a portable, shadcn-style React assistant toolkit. `@bart-ui/cli`
copies its source into a consumer repository; consumers own that source and
have no bart-ui runtime dependency. The shipped assistant is named Bart and
provides streaming chat, site knowledge, safe navigation, element highlighting,
and opt-in button clicking. Models and API keys always remain in consumer-owned
server code.

## What exists

- `registry/`: headless chat core, dock/sidebar/spotlight shells, composable UI
  parts, CSS tokens, selection-to-chat, resize behavior, tool policies, and a
  hardened Fetch-standard server handler with a separate Node HTTP bridge.
- `apps/playground/`: Vite site and same-process `/api/bart` middleware using a
  deterministic mock model. Vite serves the UI and API on port 5173.
- `packages/cli/`: zero-runtime-dependency `@bart-ui/cli`. `bart init` copies
  bundled templates, writes `.bart.json` with file hashes, and adds required
  dependencies without replacing consumer ranges.
- Tests: 159 unit/component tests and 8 Playwright flows.

Not built yet: `bart add`, `sync`, `doctor`, and `update`; markdown ingestion;
framework adapters/example apps; provider factories; durable rate limiting.
Those CLI commands currently report that they are unavailable.

## Workspace map

- `registry/src/core/`: `use-bart-chat.ts` owns conversation behavior and
  security; `tool-policy.ts`, lifecycle, resize, selection, shortcut,
  highlighting, interaction, and focus utilities live beside it.
- `registry/src/components/`: `BartChat`, `BartProvider`, three shells,
  selection popover, icons, and composable chat parts.
- `registry/src/server/`: Fetch handler, context selection, and isolated
  `server/node.ts` bridge. Never import the Node bridge from the Fetch entry.
- `registry/src/styles.css`: plain CSS and semantic `bart-*` classes.
  `tailwind.css` is the optional Tailwind v4 token bridge.
- `apps/playground/server/`: mock model, manifests, and the handler Vite loads
  as middleware. `*.local.ts` real-provider modules are generated and ignored.
- `packages/cli/templates/` and `dist/`: generated, ignored, rebuilt by
  `prepack`; the published package allowlist is `bin`, `dist`, `templates`.

Dependencies use Bun isolated installs, so declare packages in the workspace
where they are used; nothing can rely on root hoisting.

## Commands

From the repository root:

```bash
bun install
bun run playground       # Vite + offline mock API on http://localhost:5173
bun run typecheck
bun test
bun run test:e2e
bun run cli:build
```

Real Gemini testing is one command, not an additional process:

```bash
# Put GOOGLE_GENERATIVE_AI_API_KEY=... in the root .env first.
bun run scripts/dev-real.ts
```

The launcher generates `apps/playground/server/gemini.local.ts`, temporarily
makes `@ai-sdk/google` resolvable without committing it, and starts Vite with
the real handler at `/api/bart` on port 5173. Do not also run `bun run
playground`; that command is only for the offline mock. OpenAI and Anthropic
are selected with `--provider openai|anthropic`; `--model` overrides the model.

## Working rules

- Bun only: use `bun add`/`bun remove`, `bun test`, and `bunx`. Never add npm,
  pnpm, or Yarn lockfiles, and never hand-edit dependency versions.
- Use official initializers for new packages/apps; inspect their output, then
  make targeted edits.
- Prefer `rg`/`rg --files`. Large CSS and app files have section markers; read
  only the relevant section.
- Preserve unrelated work in a dirty tree. Use `apply_patch` for edits. Never
  use destructive Git commands without explicit approval.
- Commit at meaningful checkpoints. Generated files and real-provider local
  artifacts must stay uncommitted.
- Verification ladder: `bun run typecheck`, then `bun test`, then
  `bun run test:e2e` only when browser behavior or integration changed.
- Registry code must satisfy the playground strict TypeScript settings,
  including unused-code and unchecked-index checks.
- Pinned stack: AI SDK v5 (`ai@^5`, `@ai-sdk/react@^2`), `zod@^4`, React 19,
  `react-markdown@^10`, `remark-gfm@^4`, and Tailwind v4.

## Architecture invariants

Do not weaken these constraints.

1. **Copied source:** the CLI bundles versioned registry templates and copies
   them locally. Runtime code is never imported from the CLI or downloaded at
   install time.
2. **Core owns security:** approval, allowlists, validation, and per-turn caps
   live in `useBartChat`/`tool-policy.ts`, never in shells or composable parts.
3. **Server secrets:** credentials, provider, model, and system prompt are
   server-owned. Browser requests cannot override them or send system roles.
4. **Navigation:** accept only exact manifest routes. Reject schemes, hosts,
   protocol-relative and unknown URLs; navigate through the injected router,
   default to confirmation, and enforce the per-turn cap.
5. **Targets and clicks:** resolve only `data-bart-target` IDs from the current
   route. Clicking additionally requires `interactive: true`, confirmation by
   default, a native enabled button-like element, and a per-turn cap. Never
   click links or text inputs.
6. **Context is data:** delimit markdown and catalogs, tell the model embedded
   instructions are untrusted, neutralize every `<bart-...` sequence, escape
   attributes, and collapse catalog newlines.
7. **Request hardening:** allowlist message parts; enforce byte/body, count,
   length, output, step, and duration caps; validate origin and authorization;
   abort on disconnect; never buffer beyond the limit or log prompts/secrets.
8. **Policies:** tools are `auto | confirm | disabled`. Defaults are highlight
   `auto`, navigate `confirm`, interact `confirm`. Auto-approve may upgrade
   `confirm` only; it never re-enables `disabled`.
9. **Spotlight shortcut:** ignore editable elements, IME composition,
   modifiers, and handled events. Escape closes and restores focus.
10. **Selections:** ignore Bart UI, normalize and deduplicate text, cap each at
    600 characters and pending items at eight, and expose the behavior through
    every shell.
11. **Environment boundary:** `.bart.json` defines the consumer project root.
    Content defaults to `content/bart`; secrets load server-side from root
    `.env`/`.env.local`, never `VITE_` or `NEXT_PUBLIC_` variables.
12. **Provider neutrality:** no provider adapter may appear in a committed
    package manifest. `scripts/dev-real.ts` is neutral; its adapter install and
    generated `*.local.ts` module remain uncommitted.
13. **Distribution allowlist:** templates contain only declared runtime files
    and dependencies—never apps, tests, fixtures, screenshots, env files,
    development manifests, or provider-specific artifacts.

## Component and styling rules

- Conversation behavior belongs in the headless core/shared chrome and must
  work in all shells. Variant-only behavior is presentational or input-specific.
- `<BartChat>` is the default wrapper. `<BartProvider>` plus `BartHeader`,
  `BartBody`, `BartMessages`, `BartInput`, actions, and shells form the
  composable API. Parts read `useBartContext` directly — there is no internal
  prop-taking layer to thread new props through; do not prop-drill chat state.
  `LauncherButton` owns the collapsed-launcher wiring and a11y contract for
  the dock and sidebar.
- Composable parts are presentation only. Omitting a button may hide an action
  but must not alter tool enforcement.
- Cosmetic options are props (`appearance`, `icon`, `title`, shell header,
  separator, side, launcher), not component forks. Cosmetic slots follow the
  same rule: `BartMessages` takes `emptyState`, `AutoApproveButton` takes
  children in place of its glyph. Each cosmetic default lives once, in the
  provider or shell — `BartChat` forwards `undefined`, never a second copy.
- Identity discipline: `useBartChat` returns one memoized object and
  `BartProvider` memoizes the context value keyed on it. Anything added to
  either must be identity-stable (useCallback/useMemo, latest-value refs, or
  module-constant defaults — never an inline default parameter), or every part
  re-renders on every provider render. `MarkdownContent` is memoized on its
  text; message re-parsing must never scale with stream chunks.
- `styles.css` stays plain CSS. Theme through `--bart-*` tokens with light and
  `.dark` values meeting WCAG AA; never hardcode theme-dependent colors.

## Load-bearing gotchas

- Never import `ai/test` in running server code; it pulls Vitest/MSW at runtime.
  The mock is a plain `LanguageModelV2` using `simulateReadableStream`.
- Happy DOM replaces Fetch/stream globals with incompatible lookalikes.
  `test-setup.ts` must register Happy DOM, then restore Bun natives. It also
  never emits CSS `animationend`; tests dispatch that event explicitly.
- Panel exit state belongs to `use-shell-lifecycle.ts`: `open` flips false,
  `closing` keeps the panel mounted, and `animationend` unmounts it. Do not add
  JS duration timers. Reduced motion skips closing; controlled close unmounts
  immediately; reopening mid-exit cancels the close.
- Focus restoration must run after the launcher remount commit, not directly
  in a close handler. Use the lifecycle hook's `restoreFocusTo` — all three
  shells do: dock/sidebar pass their launcher ref, the spotlight passes the
  element its shortcut handler captured. Do not add a shell-local restore path.
- `.bart-glass` intentionally has no border or box-shadow: combining either
  with `backdrop-filter` causes a pale unfiltered perimeter. Do not add a rim
  or edge without discussing the design. Solid dock panels are also borderless.
- Bart layers on a fixed z-scale: highlight overlay 30 < dock/sidebar 40 <
  spotlight 50 < selection popover 70. The overlay marks page content and must
  stay below every Bart surface.
- Host backgrounds must paint `body`/`html`, not an inner wrapper, because the
  sidebar pushes `body` and glass needs canvas behind the panel.
- `[data-bart-ui] button:not(:disabled)` outranks a lone class. Resize handles
  require `.bart-resize-handle`; pointer-only edge handles are not focusable.
- Pointer capture does not preserve the cursor. `use-resize-drag.ts` owns the
  page-wide resize class and must clean it on up, cancel, and unmount.
- Sidebar width and push margin share `--bart-sidebar-width`; update that one
  variable and disable the margin transition only while dragging.
- Tailwind cannot discover the symlinked registry automatically; the playground
  CSS declares `@source "../../../registry/src"`.
- The playground mounts `/api/bart` through `toNodeHandler`, so UI and API are
  same-origin on 5173 and default origin validation applies.

## Testing placement

- Pure validators, ranking, budgets, shortcuts, resize math, and server
  boundaries: colocated `*.test.ts`, run by `bun test`.
- Shared shell behavior: table-driven
  `components/variants.contract.test.tsx` in Happy DOM. Assert visible behavior,
  not implementation details.
- Real browser/streaming/tool flows: `apps/playground/e2e/*.e2e.ts` with the
  deterministic mock. Keep the `.e2e.ts` suffix so Bun does not collect them.
  The suite boots its own Vite on port 5183 — never 5173, so it cannot reuse
  a running dev/dev-real server and silently test against a real provider.
- Use screenshots only for genuinely visual regressions and clip narrowly.

## Future markdown sync contract

Content defaults to `<project-root>/content/bart`. Front matter requires unique
`title`, `description`, and relative `route`; `keywords` and unique per-route
targets are optional. `bart sync` will generate a browser-safe public manifest
and a server-only manifest with bodies. The server validates the current route,
includes it first, then uses deterministic lexical ranking under a 40,000
character default budget; `search_content` retrieves additional excerpts.
Vector retrieval is out of V1 scope.
