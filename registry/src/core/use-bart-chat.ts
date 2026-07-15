"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useChat, type UseChatHelpers } from "@ai-sdk/react";
import {
  DefaultChatTransport,
  lastAssistantMessageIsCompleteWithToolCalls,
} from "ai";
import { runHighlight } from "./highlight";
import {
  appendSelection,
  buildQuotedMessage,
  MAX_SELECTION_ITEMS,
} from "./selection";
import { resolveToolPolicies, validateRoute, validateTarget } from "./tool-policy";
import type {
  BartPublicManifest,
  BartToolOutput,
  BartToolPolicies,
  BartUIMessage,
  HighlightInput,
  NavigateInput,
} from "./types";

export type BartToolName = "navigate" | "highlight";

export interface UseBartChatOptions {
  api: string;
  currentRoute: string;
  navigate: (route: string) => void;
  manifest: BartPublicManifest;
  toolPolicy?: Partial<BartToolPolicies>;
  /** Hard cap on navigations per assistant turn to prevent loops. */
  maxNavigationsPerTurn?: number;
  /** Maximum selected-text pills attached to the next message. Default 8. */
  maxPendingSelections?: number;
}

export interface UseBartChatReturn {
  messages: BartUIMessage[];
  status: UseChatHelpers<BartUIMessage>["status"];
  error: Error | undefined;
  policies: BartToolPolicies;
  sendText: (text: string) => void;
  stop: () => void;
  clearError: () => void;
  /** Selected page-text items attached to the next message. */
  pendingQuotes: string[];
  attachQuote: (rawSelection: string) => void;
  removeQuote: (index: number) => void;
  clearQuotes: () => void;
  /** Start a fresh conversation: aborts streaming, clears messages/quote/error. */
  reset: () => void;
  /** Resolve a pending `confirm`-policy tool call from the approval UI. */
  respondToToolCall: (options: {
    toolName: BartToolName;
    toolCallId: string;
    input: unknown;
    approved: boolean;
  }) => void;
}

/**
 * Headless core shared by every Bart variant. Owns transport, streaming
 * state, and — deliberately — all tool-policy enforcement, so replacing or
 * restyling a variant shell cannot weaken navigation/highlight rules.
 */
export function useBartChat(options: UseBartChatOptions): UseBartChatReturn {
  const { api, manifest } = options;
  const policies = resolveToolPolicies(options.toolPolicy);
  const maxNavigations = options.maxNavigationsPerTurn ?? 2;
  const maxPendingSelections =
    options.maxPendingSelections ?? MAX_SELECTION_ITEMS;

  const routeRef = useRef(options.currentRoute);
  routeRef.current = options.currentRoute;
  const navigateRef = useRef(options.navigate);
  navigateRef.current = options.navigate;
  const policiesRef = useRef(policies);
  policiesRef.current = policies;
  const navigationsThisTurn = useRef(0);
  const helpersRef = useRef<UseChatHelpers<BartUIMessage> | null>(null);

  const executeTool = useCallback(
    (toolName: BartToolName, input: unknown): BartToolOutput => {
      if (toolName === "navigate") {
        const route = (input as NavigateInput | undefined)?.route;
        const check = validateRoute(manifest, route);
        if (!check.ok) return check;
        if (navigationsThisTurn.current >= maxNavigations) {
          return { ok: false, reason: "navigation-limit-reached" };
        }
        navigationsThisTurn.current += 1;
        navigateRef.current(route as string);
        return { ok: true };
      }
      const target = (input as HighlightInput | undefined)?.target;
      const check = validateTarget(manifest, routeRef.current, target);
      if (!check.ok) return check;
      return runHighlight(target as string);
    },
    [manifest, maxNavigations],
  );

  const transport = useMemo(
    () =>
      new DefaultChatTransport<BartUIMessage>({
        api,
        prepareSendMessagesRequest: ({ id, messages }) => ({
          body: { id, messages, currentRoute: routeRef.current },
        }),
      }),
    [api],
  );

  const chat = useChat<BartUIMessage>({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall: ({ toolCall }) => {
      const toolName = toolCall.toolName as BartToolName;
      const helpers = helpersRef.current;
      if (!helpers) return;
      const policy = policiesRef.current[toolName];
      if (policy === undefined) {
        void helpers.addToolOutput({
          state: "output-error",
          tool: toolName,
          toolCallId: toolCall.toolCallId,
          errorText: "unknown-tool",
        });
        return;
      }
      // `confirm` waits for the approval UI; everything else resolves now.
      if (policy === "confirm") return;
      const output: BartToolOutput =
        policy === "disabled"
          ? { ok: false, reason: "disabled-by-policy" }
          : executeTool(toolName, toolCall.input);
      void helpers.addToolOutput({
        tool: toolName,
        toolCallId: toolCall.toolCallId,
        output,
      });
    },
  });
  helpersRef.current = chat;

  const [pendingQuotes, setPendingQuotes] = useState<string[]>([]);

  const sendText = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (trimmed.length === 0) return;
      navigationsThisTurn.current = 0;
      const message = pendingQuotes.length > 0
        ? buildQuotedMessage(pendingQuotes, trimmed)
        : trimmed;
      setPendingQuotes([]);
      void chat.sendMessage({ text: message });
    },
    [chat.sendMessage, pendingQuotes],
  );

  const attachQuote = useCallback((rawSelection: string) => {
    setPendingQuotes((current) =>
      appendSelection(current, rawSelection, maxPendingSelections),
    );
  }, [maxPendingSelections]);

  const reset = useCallback(() => {
    void chat.stop();
    chat.setMessages([]);
    chat.clearError();
    setPendingQuotes([]);
    navigationsThisTurn.current = 0;
  }, [chat.stop, chat.setMessages, chat.clearError]);

  const respondToToolCall = useCallback<UseBartChatReturn["respondToToolCall"]>(
    ({ toolName, toolCallId, input, approved }) => {
      const output: BartToolOutput = approved
        ? executeTool(toolName, input)
        : { ok: false, reason: "denied-by-user" };
      void chat.addToolOutput({ tool: toolName, toolCallId, output });
    },
    [chat.addToolOutput, executeTool],
  );

  return {
    messages: chat.messages,
    status: chat.status,
    error: chat.error,
    policies,
    sendText,
    stop: () => void chat.stop(),
    clearError: chat.clearError,
    pendingQuotes,
    attachQuote,
    removeQuote: (index) =>
      setPendingQuotes((current) =>
        current.filter((_, currentIndex) => currentIndex !== index),
      ),
    clearQuotes: () => setPendingQuotes([]),
    reset,
    respondToToolCall,
  };
}
