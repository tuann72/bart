"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import { getToolName, isToolUIPart, type ToolUIPart } from "ai";
import { motionDisabled } from "../core/motion";
import {
  isBartToolName,
  type BartToolName,
  type UseBartChatReturn,
} from "../core/use-bart-chat";
import type {
  BartAppearance,
  BartToolOutput,
  BartTools,
  BartUIMessage,
} from "../core/types";
import {
  BartIcon,
  CheckIcon,
  CloseIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
  ZapIcon,
} from "./icons";
import { MarkdownContent } from "./markdown";

type BartToolPart = ToolUIPart<BartTools>;

/** The surface-finish class every shell places on its panel(s). */
export function surfaceClass(appearance: BartAppearance = "default"): string {
  return appearance === "glass" ? "bart-glass" : "bart-solid";
}

/**
 * Resolve the dock/sidebar `header` prop: `undefined`/`true` render the
 * standard PanelHeader, `false`/`null` render nothing, anything else is the
 * consumer's own header node.
 */
export function resolveHeader(
  header: ReactNode,
  standard: ReactNode,
): ReactNode {
  if (header === undefined || header === true) return standard;
  return header;
}

const THINKING_WORDS = [
  "Pondering",
  "Tinkering",
  "Connecting dots",
  "Rummaging",
  "Cooking up an answer",
] as const;

function ThinkingIndicator() {
  const [wordIndex, setWordIndex] = useState(0);

  useEffect(() => {
    if (motionDisabled()) return;
    const timer = window.setInterval(() => {
      setWordIndex((current) => (current + 1) % THINKING_WORDS.length);
    }, 1_600);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="bart-typing" role="status" aria-label="Bart is thinking">
      <span className="bart-typing-label" aria-hidden="true">
        {THINKING_WORDS[wordIndex]}
      </span>
      <span className="bart-typing-dots" aria-hidden="true">
        <span />
        <span />
        <span />
      </span>
    </div>
  );
}

/** Natural-language phrasing for each tool, keyed by lifecycle moment. */
function toolPhrases(name: BartToolName, input: unknown) {
  if (name === "navigate") {
    const route = (input as { route?: string } | undefined)?.route ?? "…";
    return {
      question: `Bart wants to navigate to ${route}`,
      progress: `Navigating to ${route}`,
      approved: `You approved navigation to ${route}`,
      done: `Navigated to ${route}`,
      denied: `You denied navigation to ${route}`,
      failed: `Couldn't navigate to ${route}`,
    };
  }
  const target = (input as { target?: string } | undefined)?.target ?? "…";
  return {
    question: `Bart wants to highlight “${target}”`,
    progress: `Highlighting “${target}”`,
    approved: `You approved highlighting “${target}”`,
    done: `Highlighted “${target}”`,
    denied: `You denied highlighting “${target}”`,
    failed: `Couldn't highlight “${target}”`,
  };
}

function ToolPartView({
  part,
  bart,
}: {
  part: BartToolPart;
  bart: UseBartChatReturn;
}) {
  const toolName = getToolName(part);
  // A tool this build doesn't know renders as an inert row: no approval card,
  // no policy lookup, nothing executable.
  if (!isBartToolName(toolName)) {
    return (
      <div className="bart-tool-row bart-muted">{String(toolName)} (unsupported)</div>
    );
  }
  const phrases = toolPhrases(toolName, part.input);

  if (part.state === "input-streaming") {
    return <div className="bart-tool-row bart-muted">{phrases.progress}…</div>;
  }

  if (part.state === "input-available") {
    if (bart.policies[toolName] === "confirm") {
      return (
        <div className="bart-tool-card">
          <p className="bart-tool-question">{phrases.question}</p>
          <div className="bart-tool-actions">
            <button
              type="button"
              className="bart-btn-primary"
              onClick={() =>
                bart.respondToToolCall({
                  toolName,
                  toolCallId: part.toolCallId,
                  input: part.input,
                  approved: true,
                })
              }
            >
              Allow
            </button>
            <button
              type="button"
              className="bart-btn-ghost"
              onClick={() =>
                bart.respondToToolCall({
                  toolName,
                  toolCallId: part.toolCallId,
                  input: part.input,
                  approved: false,
                })
              }
            >
              Deny
            </button>
          </div>
        </div>
      );
    }
    return <div className="bart-tool-row bart-muted">{phrases.progress}…</div>;
  }

  if (part.state === "output-available") {
    const output = part.output as BartToolOutput;
    if (output.ok) {
      return (
        <div className="bart-tool-row">
          <CheckIcon /> {output.approvedByUser ? phrases.approved : phrases.done}
        </div>
      );
    }
    return (
      <div className="bart-tool-row">
        <CloseIcon size={12} />{" "}
        {output.reason === "denied-by-user"
          ? phrases.denied
          : `${phrases.failed} — ${output.reason ?? "failed"}`}
      </div>
    );
  }

  return (
    <div className="bart-tool-row">
      <CloseIcon size={12} /> {phrases.failed} — {part.errorText}
    </div>
  );
}

export function MessageList({
  bart,
  messages,
  className = "",
}: {
  bart: UseBartChatReturn;
  messages: BartUIMessage[];
  className?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  const assistantHasVisibleOutput =
    lastMessage?.role === "assistant" &&
    lastMessage.parts.some(
      (part) =>
        (part.type === "text" && part.text.trim().length > 0) ||
        isToolUIPart<BartTools>(part),
    );
  const showThinking =
    bart.status === "submitted" ||
    (bart.status === "streaming" && !assistantHasVisibleOutput);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  return (
    <div
      ref={scrollRef}
      className={`bart-message-list ${className}`}
      aria-live="polite"
    >
      {messages.length === 0 && (
        <p className="bart-muted bart-empty-hint">
          Ask about this site, highlight something on the page, or navigate to
          another section.
        </p>
      )}
      {messages.map((message) => (
        <div
          key={message.id}
          className={
            message.role === "user" ? "bart-msg-user" : "bart-msg-assistant"
          }
        >
          {message.parts.map((part, i) => {
            if (part.type === "text") {
              return (
                <MarkdownContent key={i}>{part.text}</MarkdownContent>
              );
            }
            if (isToolUIPart<BartTools>(part)) {
              return <ToolPartView key={part.toolCallId} part={part} bart={bart} />;
            }
            return null;
          })}
        </div>
      ))}
      {showThinking && <ThinkingIndicator />}
      {bart.error && (
        <div className="bart-error" role="alert">
          <p>Something went wrong: {bart.error.message}</p>
          <button type="button" className="bart-btn-ghost" onClick={bart.clearError}>
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatInput({
  bart,
  placeholder = "Ask Bart…",
  autoFocus = false,
  className = "",
}: {
  bart: UseBartChatReturn;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const busy = bart.status === "submitted" || bart.status === "streaming";

  useEffect(() => {
    if (bart.pendingQuotes.length > 0) inputRef.current?.focus();
  }, [bart.pendingQuotes.length]);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    bart.sendText(value);
    setValue("");
  };

  return (
    <form className={`bart-input-area ${className}`} onSubmit={onSubmit}>
      {bart.pendingQuotes.length > 0 && (
        <div className="bart-quote-list" aria-label="Selected text to ask about">
          {bart.pendingQuotes.map((quote, index) => (
            <div className="bart-quote-chip" key={quote} title={quote}>
              <span className="bart-quote-chip-text">“{quote}”</span>
              <button
                type="button"
                className="bart-icon-btn bart-quote-chip-dismiss"
                aria-label={`Remove selected text ${index + 1}`}
                onClick={() => bart.removeQuote(index)}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="bart-input-row">
        <div className="bart-input-shell">
          <input
            ref={inputRef}
            className="bart-input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={
              bart.pendingQuotes.length > 0
                ? "Ask about the selected text…"
                : placeholder
            }
            aria-label="Message Bart"
            autoFocus={autoFocus}
          />
          {busy ? (
            <button
              type="button"
              className="bart-send-btn"
              aria-label="Stop generating"
              title="Stop"
              onClick={bart.stop}
            >
              <StopIcon />
            </button>
          ) : (
            <button
              type="submit"
              className="bart-send-btn"
              aria-label="Send message"
              title="Send"
              disabled={value.trim().length === 0}
            >
              <SendIcon />
            </button>
          )}
        </div>
      </div>
    </form>
  );
}

/** Switch that lets the user skip approval cards for navigate/highlight. */
export function AutoApproveToggle({
  bart,
  label = false,
}: {
  bart: UseBartChatReturn;
  /** Show a text label (spotlight) instead of the lightning glyph. */
  label?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="bart-switch"
      aria-checked={bart.autoApprove}
      aria-label="Automatically approve navigation and highlights"
      title={
        bart.autoApprove
          ? "Auto-approve is on — Bart navigates and highlights without asking"
          : "Auto-approve navigation and highlights"
      }
      onClick={() => bart.setAutoApprove(!bart.autoApprove)}
    >
      {label ? "Auto-approve" : <ZapIcon size={12} />}
      <span className="bart-switch-track" aria-hidden="true">
        <span className="bart-switch-thumb" />
      </span>
    </button>
  );
}

/** Title row shared by the dock and sidebar shells: brand, auto-approve, new chat, close. */
export function PanelHeader({
  title,
  icon = <BartIcon />,
  bart,
  onClose,
}: {
  title: string;
  icon?: ReactNode;
  bart: UseBartChatReturn;
  onClose: () => void;
}) {
  const onNewChat = bart.reset;
  return (
    <header className="bart-panel-header">
      <span className="bart-panel-title">
        {icon} {title}
      </span>
      <div className="bart-panel-actions">
        <AutoApproveToggle bart={bart} />
        <button
          type="button"
          className="bart-icon-btn"
          aria-label="Start new chat"
          title="Start new chat"
          onClick={onNewChat}
        >
          <RefreshIcon />
        </button>
        <button
          type="button"
          className="bart-icon-btn"
          aria-label="Close chat"
          title="Close chat"
          onClick={onClose}
        >
          <CloseIcon />
        </button>
      </div>
    </header>
  );
}

/** Standard stacked layout used by the dock and sidebar shells. */
export function ChatPanel({
  bart,
  autoFocus = true,
}: {
  bart: UseBartChatReturn;
  autoFocus?: boolean;
}) {
  return (
    <div className="bart-panel-body">
      <MessageList bart={bart} messages={bart.messages} />
      <ChatInput bart={bart} autoFocus={autoFocus} />
    </div>
  );
}
