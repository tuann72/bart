import { simulateReadableStream } from "ai";
import type {
  LanguageModelV2,
  LanguageModelV2Prompt,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";

/**
 * Scripted mock model: deterministic, offline, no API key. It streams canned
 * text and emits navigate/highlight tool calls on keyword triggers so every
 * client code path (streaming, approvals, tool results) can be exercised.
 *
 * Implemented as a plain LanguageModelV2 rather than `ai/test`'s
 * MockLanguageModelV2 because that entry point drags in test-runner
 * dependencies (vitest, msw) that don't belong in a running server.
 */

function lastUserText(prompt: LanguageModelV2Prompt): string {
  for (let i = prompt.length - 1; i >= 0; i -= 1) {
    const message = prompt[i];
    if (message?.role !== "user") continue;
    return message.content
      .map((part) => (part.type === "text" ? part.text : ""))
      .join(" ");
  }
  return "";
}

function textParts(text: string): LanguageModelV2StreamPart[] {
  const id = "text-1";
  const deltas = text.split(/(?<=\s)/);
  return [
    { type: "text-start", id },
    ...deltas.map(
      (delta): LanguageModelV2StreamPart => ({ type: "text-delta", id, delta }),
    ),
    { type: "text-end", id },
  ];
}

function toolCallParts(
  toolName: "navigate" | "highlight" | "interact",
  input: object,
): LanguageModelV2StreamPart[] {
  const id = `call-${toolName}`;
  const inputJson = JSON.stringify(input);
  return [
    { type: "tool-input-start", id, toolName },
    { type: "tool-input-delta", id, delta: inputJson },
    { type: "tool-input-end", id },
    { type: "tool-call", toolCallId: id, toolName, input: inputJson },
  ];
}

function pickRoute(text: string): string {
  if (
    text.includes("faq") ||
    text.includes("question") ||
    text.includes("allerg") ||
    text.includes("dietary")
  ) {
    return "/faq";
  }
  if (
    text.includes("pricing") ||
    text.includes("menu") ||
    text.includes("price") ||
    text.includes("combo")
  ) {
    return "/pricing";
  }
  if (text.includes("home")) return "/";
  return "/pricing";
}

function pickTarget(text: string): string {
  if (
    text.includes("dietary") ||
    text.includes("vegan") ||
    text.includes("vegetarian") ||
    text.includes("gluten") ||
    text.includes("allerg")
  ) {
    return "dietary-faq";
  }
  if (
    text.includes("faq") ||
    text.includes("order") ||
    text.includes("delivery") ||
    text.includes("reservation")
  ) {
    return "ordering-faq";
  }
  if (text.includes("combo") || text.includes("side") || text.includes("shake")) {
    return "combo-deals";
  }
  if (
    text.includes("pricing") ||
    text.includes("price") ||
    text.includes("menu") ||
    text.includes("burger")
  ) {
    return "burger-menu";
  }
  if (text.includes("hour") || text.includes("location") || text.includes("visit")) {
    return "visit-us";
  }
  if (text.includes("signature") || text.includes("favorite")) {
    return "signature-burgers";
  }
  return "home-hero";
}

function respond(prompt: LanguageModelV2Prompt): {
  parts: LanguageModelV2StreamPart[];
  finishReason: "stop" | "tool-calls";
} {
  const last = prompt[prompt.length - 1];

  // Follow-up request after a client tool resolved: acknowledge the outcome.
  if (last?.role === "tool") {
    const result = last.content.find((part) => part.type === "tool-result");
    const value =
      result && result.output.type === "json"
        ? (result.output.value as { ok?: boolean; reason?: string })
        : undefined;
    const verb =
      result?.toolName === "navigate"
        ? "navigate"
        : result?.toolName === "interact"
          ? "click that"
          : "highlight";
    if (value?.ok) {
      return {
        parts: textParts(
          result?.toolName === "navigate"
            ? "Done — you're on the page now. Anything else you want to find?"
            : result?.toolName === "interact"
              ? "Done — your pickup order is started. It'll be ready in 15–20 minutes."
              : "There it is — I've highlighted it on the page for you.",
        ),
        finishReason: "stop",
      };
    }
    return {
      parts: textParts(
        `No problem — I didn't ${verb} (${value?.reason ?? "not completed"}). Anything else?`,
      ),
      finishReason: "stop",
    };
  }

  const raw = lastUserText(prompt);

  // "Ask about selection" messages arrive as a markdown blockquote followed
  // by the question. Answer about the quote unless the question itself asks
  // for a tool action.
  if (raw.startsWith("> ")) {
    const lines = raw.split("\n");
    const quote = lines
      .filter((line) => line.startsWith("> "))
      .map((line) => line.slice(2))
      .join(" ");
    const question = lines.filter((line) => !line.startsWith("> ")).join(" ").toLowerCase();
    if (!/highlight|go to|navigate|take me/.test(question)) {
      const excerpt = quote.length > 80 ? `${quote.slice(0, 80)}…` : quote;
      return {
        parts: textParts(
          `You selected: “${excerpt}”. That passage is part of the Stackhouse site. This scripted reply confirms the selected text reached the model; switch to a real provider for a contextual answer.`,
        ),
        finishReason: "stop",
      };
    }
  }

  const text = raw.toLowerCase();

  if (/start (a |my |the )?(pickup )?order|place (a |an |my )?order|order pickup/.test(text)) {
    return {
      parts: toolCallParts("interact", { target: "start-order" }),
      finishReason: "tool-calls",
    };
  }

  if (text.includes("highlight") || text.includes("show me the")) {
    return {
      parts: toolCallParts("highlight", { target: pickTarget(text) }),
      finishReason: "tool-calls",
    };
  }

  if (
    text.includes("go to") ||
    text.includes("navigate") ||
    text.includes("take me") ||
    text.includes("open the")
  ) {
    return {
      parts: toolCallParts("navigate", { route: pickRoute(text) }),
      finishReason: "tool-calls",
    };
  }

  if (
    text.includes("vegetarian") ||
    text.includes("vegan") ||
    text.includes("gluten") ||
    text.includes("allerg") ||
    text.includes("peanut")
  ) {
    return {
      parts: textParts(
        "The **Garden Crunch** is vegetarian and can be made vegan without mayo. Any burger can come in a lettuce wrap, but the kitchen is not certified gluten-free. Fries and rings use refined peanut oil in a shared fryer; tell the cashier about any allergy before ordering.",
      ),
      finishReason: "stop",
    };
  }

  if (
    text.includes("price") ||
    text.includes("cost") ||
    text.includes("menu") ||
    text.includes("burger") ||
    text.includes("combo")
  ) {
    return {
      parts: textParts(
        `## Burger prices

| Burger | Price |
| --- | ---: |
| The Stackhouse | $13 |
| Smoke Show | $14 |
| Garden Crunch | $11 |

Add fries and a fountain drink for **$5**. Say “highlight the burger menu” or “take me to pricing” to see more.`,
      ),
      finishReason: "stop",
    };
  }

  if (
    text.includes("hour") ||
    text.includes("open") ||
    text.includes("location") ||
    text.includes("where")
  ) {
    return {
      parts: textParts(
        `Stackhouse is at **42 Griddle Lane in Chicago's West Loop**, two blocks west of Morgan Station.

- **Mon–Thu:** 11am–10pm
- **Fri–Sat:** 11am–midnight
- **Sunday:** 11am–9pm`,
      ),
      finishReason: "stop",
    };
  }

  if (
    text.includes("pickup") ||
    text.includes("delivery") ||
    text.includes("reservation") ||
    text.includes("order ahead")
  ) {
    return {
      parts: textParts(
        "Pickup usually takes **15–20 minutes**, and delivery is available within five miles. Stackhouse is walk-in only; parties of eight or more can call ahead for help sitting together.",
      ),
      finishReason: "stop",
    };
  }

  return {
    parts: textParts(
      `Welcome to **Stackhouse Burger Co.** I can help with the menu, hours, ordering, and dietary questions.

Try asking:
- “How much is the Smoke Show?”
- “Highlight the combo deals”
- “Take me to the FAQ”
- “Start a pickup order” (on the pricing page)`,
    ),
    finishReason: "stop",
  };
}

export const mockModel: LanguageModelV2 = {
  specificationVersion: "v2",
  provider: "bart-playground",
  modelId: "scripted-mock",
  supportedUrls: {},
  doGenerate: async () => {
    throw new Error("The scripted mock model only supports streaming.");
  },
  doStream: async ({ prompt }) => {
    const { parts, finishReason } = respond(prompt);
    return {
      stream: simulateReadableStream<LanguageModelV2StreamPart>({
        initialDelayInMs: 150,
        chunkDelayInMs: 30,
        chunks: [
          { type: "stream-start", warnings: [] },
          ...parts,
          {
            type: "finish",
            finishReason,
            usage: { inputTokens: 24, outputTokens: 48, totalTokens: 72 },
          },
        ],
      }),
    };
  },
};
