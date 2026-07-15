import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { useBartChat } from "../core/use-bart-chat";
import type { BartPublicManifest, BartVariant } from "../core/types";
import { BartDock } from "./dock";
import { BartSidebar } from "./sidebar";
import { BartSpotlight } from "./spotlight";

/**
 * Contract suite: the behavior every variant must expose, run against all
 * three shells. Written against the pre-refactor components and kept passing
 * through the refactor — tests assert user-visible outcomes (what is mounted,
 * what has focus, what got sent), never implementation details.
 */

const manifest: BartPublicManifest = {
  routes: [
    { route: "/", title: "Home", description: "Home page", targets: [] },
    { route: "/faq", title: "FAQ", description: "Questions", targets: [] },
  ],
};

// ---------- environment shims ----------

function setReducedMotion(matches: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: matches && query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener() {},
    removeListener() {},
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

/** FIFO fetch mock: each entry answers one request, in order. */
let fetchQueue: Array<() => Response | Promise<Response>>;
const realFetch = globalThis.fetch;

beforeEach(() => {
  setReducedMotion(false);
  fetchQueue = [];
  globalThis.fetch = (async () => {
    const next = fetchQueue.shift();
    if (!next) throw new Error("unexpected fetch: queue is empty");
    return next();
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

/** A UI message stream response in the AI SDK v5 SSE wire format. */
function sse(...chunks: object[]): Response {
  const payload =
    chunks.map((chunk) => `data: ${JSON.stringify(chunk)}\n\n`).join("") +
    "data: [DONE]\n\n";
  return new Response(payload, {
    status: 200,
    headers: {
      "content-type": "text/event-stream",
      "x-vercel-ai-ui-message-stream": "v1",
    },
  });
}

const textReply = (text: string) => () =>
  sse(
    { type: "start" },
    { type: "text-start", id: "t1" },
    { type: "text-delta", id: "t1", delta: text },
    { type: "text-end", id: "t1" },
    { type: "finish" },
  );

const toolCallReply = (toolName: string, input: object) => () =>
  sse(
    { type: "start" },
    { type: "tool-input-available", toolCallId: "call-1", toolName, input },
    { type: "finish" },
  );

// ---------- harness ----------

function Host({
  variant,
  onNavigate = () => {},
}: {
  variant: BartVariant;
  onNavigate?: (route: string) => void;
}) {
  const bart = useBartChat({
    api: "/api/bart",
    currentRoute: "/",
    navigate: onNavigate,
    manifest,
  });
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        external-open
      </button>
      <button type="button" onClick={() => setOpen(false)}>
        external-close
      </button>
      {variant === "dock" && (
        <BartDock bart={bart} open={open} onOpenChange={setOpen} />
      )}
      {variant === "sidebar" && (
        <BartSidebar bart={bart} open={open} onOpenChange={setOpen} />
      )}
      {variant === "spotlight" && (
        <BartSpotlight bart={bart} open={open} onOpenChange={setOpen} />
      )}
    </>
  );
}

interface VariantDriver {
  variant: BartVariant;
  /** Perform the variant's own open gesture (launcher click / shortcut). */
  openGesture: () => void;
  /** Perform the variant's own pointer close gesture. */
  pointerClose: () => void;
  /** True when the variant restores focus to its own launcher on close. */
  restoresToLauncher: boolean;
}

const drivers: VariantDriver[] = [
  {
    variant: "dock",
    openGesture: () =>
      fireEvent.click(screen.getByRole("button", { name: "Bart" })),
    pointerClose: () =>
      fireEvent.click(screen.getByRole("button", { name: "Close chat" })),
    restoresToLauncher: true,
  },
  {
    variant: "sidebar",
    openGesture: () =>
      fireEvent.click(screen.getByRole("button", { name: "Bart" })),
    pointerClose: () =>
      fireEvent.click(screen.getByRole("button", { name: "Close chat" })),
    restoresToLauncher: true,
  },
  {
    variant: "spotlight",
    openGesture: () => fireEvent.keyDown(document.body, { key: "/" }),
    pointerClose: () => {
      const backdrop = document.querySelector(".bart-spotlight-backdrop");
      if (!backdrop) throw new Error("spotlight backdrop not rendered");
      fireEvent.click(backdrop);
    },
    restoresToLauncher: false,
  },
];

const getPanel = () => screen.getByRole("dialog");
const queryPanel = () => screen.queryByRole("dialog");
const pressEscape = () =>
  fireEvent.keyDown(document.activeElement ?? document.body, {
    key: "Escape",
  });
/** The exit animation never runs in happy-dom; report its end by hand. */
const endExitAnimation = () => {
  const panel = queryPanel();
  if (panel) fireEvent.animationEnd(panel);
};

async function openPanel(driver: VariantDriver) {
  driver.openGesture();
  await waitFor(() => expect(getPanel()).toBeTruthy());
}

async function sendMessage(text: string) {
  const input = screen.getByRole("textbox", { name: "Message Bart" });
  fireEvent.change(input, { target: { value: text } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
}

// ---------- the contract ----------

for (const driver of drivers) {
  describe(`${driver.variant} contract`, () => {
    test("opens via its own gesture into a labelled dialog", async () => {
      render(<Host variant={driver.variant} />);
      expect(queryPanel()).toBeNull();
      await openPanel(driver);
      expect(getPanel().getAttribute("aria-label")).toBe("Bart assistant");
    });

    test("Escape closes and the panel unmounts after its exit animation", async () => {
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      pressEscape();
      endExitAnimation();
      await waitFor(() => expect(queryPanel()).toBeNull());
    });

    test("the pointer close gesture closes too", async () => {
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      driver.pointerClose();
      endExitAnimation();
      await waitFor(() => expect(queryPanel()).toBeNull());
    });

    test("reduced motion closes instantly with no animation to wait on", async () => {
      setReducedMotion(true);
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      pressEscape();
      await waitFor(() => expect(queryPanel()).toBeNull());
    });

    test("closing restores focus to where it belongs", async () => {
      render(<Host variant={driver.variant} />);
      if (driver.restoresToLauncher) {
        await openPanel(driver);
        pressEscape();
        endExitAnimation();
        await waitFor(() => expect(queryPanel()).toBeNull());
        const launcher = screen.getByRole("button", { name: "Bart" });
        await waitFor(() => expect(document.activeElement).toBe(launcher));
      } else {
        // The spotlight has no launcher: it returns focus to whatever held it
        // before the shortcut opened it.
        const origin = screen.getByRole("button", { name: "external-open" });
        origin.focus();
        driver.openGesture();
        await waitFor(() => expect(getPanel()).toBeTruthy());
        pressEscape();
        endExitAnimation();
        await waitFor(() => expect(queryPanel()).toBeNull());
        await waitFor(() => expect(document.activeElement).toBe(origin));
      }
    });

    test("external controlled close unmounts the panel and cleans up", async () => {
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      fireEvent.click(screen.getByRole("button", { name: "external-close" }));
      endExitAnimation();
      await waitFor(() => expect(queryPanel()).toBeNull());
    });

    test("sends a message and renders the streamed markdown answer", async () => {
      fetchQueue.push(textReply("The **Smoke Show** is $12."));
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      await sendMessage("how much is the Smoke Show?");
      await screen.findByText("how much is the Smoke Show?");
      await waitFor(() =>
        expect(screen.getByText("Smoke Show").tagName).toBe("STRONG"),
      );
    });

    test("a failed request surfaces a dismissible error", async () => {
      fetchQueue.push(() => Promise.reject(new Error("network down")));
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      await sendMessage("hello");
      const alert = await screen.findByRole("alert");
      expect(alert.textContent).toContain("network down");
      fireEvent.click(screen.getByRole("button", { name: "Dismiss" }));
      await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
    });

    test("a confirm-policy tool call renders an approval card; Deny resolves it without executing", async () => {
      const seen: string[] = [];
      fetchQueue.push(toolCallReply("navigate", { route: "/faq" }));
      // Resolving the tool call completes the turn, which auto-sends a
      // follow-up request for the model's final answer.
      fetchQueue.push(textReply("Okay, staying here."));
      render(<Host variant={driver.variant} onNavigate={(r) => seen.push(r)} />);
      await openPanel(driver);
      await sendMessage("take me to the FAQ");
      await screen.findByText("Bart wants to: Go to /faq");
      fireEvent.click(screen.getByRole("button", { name: "Deny" }));
      await waitFor(() =>
        expect(screen.queryByText("Bart wants to: Go to /faq")).toBeNull(),
      );
      expect(seen).toEqual([]);
      await screen.findByText("Okay, staying here.");
    });

    test("New Chat is available and resets the conversation", async () => {
      fetchQueue.push(textReply("Hi!"));
      render(<Host variant={driver.variant} />);
      await openPanel(driver);
      await sendMessage("hello");
      await screen.findByText("Hi!");
      const newChat = screen.getByRole("button", {
        name: driver.variant === "spotlight" ? "New chat" : "Start new chat",
      });
      fireEvent.click(newChat);
      await waitFor(() => expect(screen.queryByText("Hi!")).toBeNull());
      // The panel itself stays open for the fresh conversation.
      expect(getPanel()).toBeTruthy();
    });
  });
}

// ---------- variant-specific contracts ----------

describe("dock specifics", () => {
  test("arrow keys on the focused corner handle resize the panel", async () => {
    render(<Host variant="dock" />);
    await openPanel(drivers[0]!);
    const panel = getPanel();
    expect(panel.style.width).toBe("384px");
    const handle = screen.getByRole("button", { name: "Resize chat panel" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    expect(panel.style.width).toBe("400px");
    fireEvent.keyDown(handle, { key: "ArrowUp", shiftKey: true });
    expect(panel.style.height).toBe("480px");
  });
});

describe("sidebar specifics", () => {
  const driver = drivers[1]!;

  test("open pushes the page via body classes; close and unmount clean them up", async () => {
    const view = render(<Host variant="sidebar" />);
    await openPanel(driver);
    expect(document.body.classList.contains("bart-sidebar-push")).toBe(true);
    expect(document.body.classList.contains("bart-sidebar-push-right")).toBe(
      true,
    );
    pressEscape();
    endExitAnimation();
    await waitFor(() => expect(queryPanel()).toBeNull());
    expect(document.body.classList.contains("bart-sidebar-push-right")).toBe(
      false,
    );
    view.unmount();
    expect(document.body.classList.contains("bart-sidebar-push")).toBe(false);
    expect(
      document.documentElement.style.getPropertyValue("--bart-sidebar-width"),
    ).toBe("");
  });

  test("keyboard resize drives the shared width variable, clamped to the minimum", async () => {
    render(<Host variant="sidebar" />);
    await openPanel(driver);
    const handle = screen.getByRole("button", { name: "Resize chat panel" });
    fireEvent.keyDown(handle, { key: "ArrowLeft" });
    // happy-dom reports zero layout width, so the clamp floor is the result.
    expect(
      document.documentElement.style.getPropertyValue("--bart-sidebar-width"),
    ).toBe("280px");
  });
});

describe("spotlight specifics", () => {
  const driver = drivers[2]!;

  test("clicking inside the card does not close it", async () => {
    render(<Host variant="spotlight" />);
    await openPanel(driver);
    fireEvent.click(screen.getByRole("textbox", { name: "Message Bart" }));
    expect(getPanel()).toBeTruthy();
  });

  test("New chat stays hidden until a conversation exists", async () => {
    render(<Host variant="spotlight" />);
    await openPanel(driver);
    expect(screen.queryByRole("button", { name: "New chat" })).toBeNull();
  });

  test("the shortcut is ignored while typing in an input", async () => {
    render(<Host variant="spotlight" />);
    const outside = screen.getByRole("button", { name: "external-open" });
    outside.focus();
    const input = document.createElement("input");
    document.body.appendChild(input);
    input.focus();
    fireEvent.keyDown(input, { key: "/" });
    expect(queryPanel()).toBeNull();
    input.remove();
  });
});
