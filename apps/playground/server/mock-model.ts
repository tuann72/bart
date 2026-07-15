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
  toolName: "navigate" | "highlight",
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
  if (text.includes("pricing") || text.includes("plan")) return "/pricing";
  if (text.includes("doc") || text.includes("quickstart")) return "/docs";
  if (text.includes("home")) return "/";
  return "/pricing";
}

function pickTarget(text: string): string {
  if (text.includes("faq")) return "pricing-faq";
  if (text.includes("pricing") || text.includes("table") || text.includes("plan")) {
    return "pricing-comparison";
  }
  if (text.includes("quickstart")) return "quickstart";
  return "hero";
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
    if (value?.ok) {
      return {
        parts: textParts(
          result?.toolName === "navigate"
            ? "Done — you're on the page now. Anything else you want to find?"
            : "There it is — I've highlighted it on the page for you.",
        ),
        finishReason: "stop",
      };
    }
    return {
      parts: textParts(
        `No problem — I didn't ${result?.toolName === "navigate" ? "navigate" : "highlight"} (${value?.reason ?? "not completed"}). Anything else?`,
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
          `You selected: “${excerpt}”. In the real product I'd answer using the site content around that passage — here in the playground this canned reply just proves the quoted selection reached the model.`,
        ),
        finishReason: "stop",
      };
    }
  }

  const text = raw.toLowerCase();

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

  if (text.includes("price") || text.includes("cost") || text.includes("plan")) {
    return {
      parts: textParts(
        "The playground has three fictional plans: Free ($0), Pro ($20/month), and Enterprise (contact us). Paid plans are billed monthly and can be cancelled at any time. Say \"highlight the pricing table\" and I'll point at it, or \"go to pricing\" to visit the page.",
      ),
      finishReason: "stop",
    };
  }

  return {
    parts: textParts(
      "Hi! I'm Bart running on the scripted mock model — no API key involved. I stream deterministic answers so you can test the UI. Try: \"what do the plans cost?\", \"highlight the pricing table\", or \"take me to the docs\".",
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
