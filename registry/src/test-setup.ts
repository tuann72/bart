import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterEach } from "bun:test";

// Registration swaps in happy-dom's whole global surface. We want its DOM,
// but its fetch stack must stay Bun's: the AI SDK pipes `response.body`
// through native stream classes, and happy-dom's lookalikes fail those
// checks ("readable should be ReadableStream").
const nativeNetwork = {
  fetch: globalThis.fetch,
  Request: globalThis.Request,
  Response: globalThis.Response,
  Headers: globalThis.Headers,
  ReadableStream: globalThis.ReadableStream,
  WritableStream: globalThis.WritableStream,
  TransformStream: globalThis.TransformStream,
  TextEncoderStream: globalThis.TextEncoderStream,
  TextDecoderStream: globalThis.TextDecoderStream,
  AbortController: globalThis.AbortController,
  AbortSignal: globalThis.AbortSignal,
};

GlobalRegistrator.register();
Object.assign(globalThis, nativeNetwork);

// React 19 warns loudly on updates outside act() unless this is declared.
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT =
  true;

// happy-dom performs no layout, so offsetParent is always null — which would
// make the focus trap consider every element invisible. Approximate "rendered"
// as "attached to a parent".
Object.defineProperty(HTMLElement.prototype, "offsetParent", {
  get(this: HTMLElement) {
    return this.parentElement;
  },
});

// Streamed chat chunks resolve in microtasks between waitFor polls, which
// React reports as updates outside act(). The tests assert final outcomes via
// waitFor, so this specific warning is noise; everything else passes through.
const realConsoleError = console.error;
console.error = (...args: unknown[]) => {
  if (typeof args[0] === "string" && args[0].includes("not wrapped in act")) {
    return;
  }
  realConsoleError(...args);
};

// Imported after registration so testing-library sees the DOM globals.
const { cleanup } = await import("@testing-library/react");

afterEach(() => {
  cleanup();
  // Component cleanup is expected to leave the page classless; tests assert on
  // specifics, this just keeps one test's leftovers out of the next.
  document.body.className = "";
  document.documentElement.removeAttribute("style");
});
