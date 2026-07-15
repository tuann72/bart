# Bart Consistency and Reuse Refactor

## Summary

Refactor the implemented registry, server, and playground without changing
Bart's behavior or weakening its security invariants. Preserve all existing
public exports while making variant capabilities consistent and reducing
duplicated shell mechanics.

The variants should share behavior, state, accessibility, and actions while
retaining distinct presentation. Dock and Sidebar should reuse common
primitives without becoming one condition-heavy component.

## Variant Architecture

- Define a common internal shell contract for `bart`, `open`, `onOpenChange`,
  and `title`; preserve the existing `BartChat`, `BartDock`, `BartSidebar`, and
  `BartSpotlight` public APIs.
- Extract a shared shell lifecycle hook that owns:
  - open, closing, and unmounted phases;
  - reduced-motion handling;
  - Escape-to-close;
  - animation completion;
  - initial focus and focus restoration;
  - external controlled close and reopen-during-close behavior.
- Modality is a per-variant decision, not a blanket hardening. The spotlight is
  modal: backdrop, focus fully contained. The dock and sidebar keep their
  Tab-cycling trap and `role="dialog"` but must NOT capture pointer or
  programmatic focus away from the page — interacting with the visible page
  while they are open is existing, intended behavior. Fix real trap bugs
  without making the page inert for any variant.
- Extract shared panel chrome:
  - title and Bart icon;
  - always-available New Chat action;
  - close action where appropriate;
  - shared action labels, icons, and reset behavior.
- Keep `ChatInput`, `MessageList`, tool approvals, errors, selections,
  streaming, stop, and reset connected exclusively to `UseBartChatReturn`.
- Treat Spotlight's latest-exchange view, history toggle, shortcut, backdrop,
  and layout as presentation differences, not reduced functionality.
- Adopt a capability rule: conversation-level functionality is implemented in
  the headless/shared layer first, then exposed by every variant. Variant-only
  behavior must be purely presentational or input-method-specific.

## Dock and Sidebar Reuse

- Keep separate Dock and Sidebar components because their dimensions,
  launchers, page-push behavior, and animations differ.
- Share lifecycle, launcher semantics, header/actions, side-direction helpers,
  numeric clamping, resize keyboard steps, and resize cleanup.
- Retain `useResizeDrag` as the pointer primitive; add focused utilities for
  side-aware deltas and size constraints instead of duplicating calculations.
- Isolate Sidebar's `<html>` and `<body>` mutations in a dedicated page-push
  hook:
  - restore only values and classes owned by Bart;
  - clean up after unmount, cancellation, and side changes;
  - prevent multiple mounted instances from corrupting global state.
- DEFERRED: replacing paired Dock/Sidebar CSS selectors with a shared
  stacked-panel class plus data attributes, and any regrouping of the
  stylesheet. Data-attribute selectors change specificity — `[data-side]`
  scores (0,1,0) where the class pairs it replaces score (0,2,0)+ — which is
  exactly the documented cursor-rule trap, and nothing in this plan's test
  suite can see a cascade regression. Restructure the stylesheet only once a
  browser-based (Playwright) suite exists to verify it. Until then the
  stylesheet keeps its current class names, selector shapes, and section
  markers; the TSX refactor must not rename or restructure CSS classes.

## Broader Code-Quality Corrections

- Replace repeated inline prop object types with named internal types and keep
  public types explicitly exported where consumers already rely on them.
- Replace unsafe tool-name and tool-output assertions with runtime type guards
  so unknown model tool parts fail safely.
- Stabilize callbacks returned by `useBartChat`, clamp configurable limits to
  documented security caps, and keep navigation counters and reset behavior
  centralized.
- Harden the server boundary:
  - enforce body limits in bytes before retaining an unbounded request body;
  - use strict request objects while accepting only validated AI message parts;
  - remove broad `unknown as UIMessage[]` conversion where possible;
  - escape manifest metadata and Markdown delimiters so content cannot
    terminate `<bart-context>` or become system instructions;
  - place the route catalog inside the same explicitly delimited data boundary.
- Extract deterministic content-search logic from the handler and test
  ranking, empty queries, excerpt limits, and stable ordering independently.
- Split the oversized playground `App.tsx` into site pages, playground
  controls, and composition code.
- Keep public and server manifests separate to protect Markdown bodies, but add
  a test that projects the server manifest's safe metadata and verifies it
  matches the public manifest until `bart sync` replaces both.
- Update README and AGENTS documentation after the refactor so the documented
  feature-parity contract, lifecycle ownership, and component boundaries match
  the code.

## Test Plan

- Sequencing: the contract suite is written FIRST, against current behavior,
  and must pass before any refactor lands. The refactor then proceeds under
  it. A no-behavior-change refactor is only as trustworthy as the tests that
  predate it.
- DOM emulators never run CSS animations, so `animationend` never fires and
  every close path that waits on `onAnimationEnd` would hang. Tests must
  dispatch synthetic AnimationEvents (with the `animationName` the component
  expects) or force reduced motion. Never resolve this by weakening component
  unmount logic.
- Add React Testing Library and a Bun-compatible DOM environment to the
  registry's development dependencies.
- Build a table-driven contract suite that runs against Dock, Sidebar, and
  Spotlight and verifies:
  - send, stop, error dismissal, tool approval, Markdown, and selected quotes;
  - New Chat is available in every variant and calls reset (the spotlight
    intentionally reveals it only once a conversation exists — that stays);
  - closing with Escape and the available pointer control;
  - focus enters correctly and returns to the proper opener;
  - controlled external close, reduced motion, and reopen during exit
    animation.
- Add focused Dock/Sidebar tests for left/right placement, pointer and keyboard
  resizing, viewport clamping, body margin synchronization, and cleanup on
  unmount.
- Add Spotlight tests for shortcut opening, backdrop closing, latest/history
  presentation, and selection-triggered focus restoration.
- Add server tests for byte limits, strict message validation, origin/auth
  handling, context-delimiter injection, catalog isolation, timeout/abort
  propagation, and content search.
- Keep the existing pure tests passing and require:
  - `bun test`
  - `bun run typecheck`
  - `bun run --cwd apps/playground lint`
- Do not require real OpenAI, Anthropic, or Gemini calls; all verification
  remains deterministic and provider-neutral.

## Acceptance Criteria and Defaults

- Existing public imports and `BartChatProps` remain compatible.
- All three variants expose the same conversation capabilities.
- Dock and Sidebar no longer duplicate lifecycle, header/action, focus, or
  generic resize behavior.
- Variant components remain thin presentation shells; security and
  conversation behavior stay in the headless core.
- Closing and reopening work correctly through both internal controls and
  controlled props.
- Global DOM changes are ownership-safe and fully cleaned up.
- Server-supplied and content-derived instructions remain securely separated.
- No provider adapter, CLI, `bart sync`, vector retrieval, storage,
  rate-limiter, or Playwright implementation is added as part of this refactor.
- The stylesheet restructure is explicitly out of scope (deferred until a
  browser-based suite can verify cascade behavior).
