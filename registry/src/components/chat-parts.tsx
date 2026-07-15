"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getToolName, isToolUIPart, type ToolUIPart } from "ai";
import { motionDisabled } from "../core/motion";
import {
  isBartToolName,
  type BartToolName,
  type UseBartChatReturn,
} from "../core/use-bart-chat";
import type { BartToolOutput, BartTools, BartUIMessage } from "../core/types";
import {
  BartIcon,
  CheckIcon,
  CloseIcon,
  RefreshIcon,
  SendIcon,
  StopIcon,
} from "./icons";
import { MarkdownContent } from "./markdown";

type BartToolPart = ToolUIPart<BartTools>;

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

function toolCallLabel(name: BartToolName, input: unknown): string {
  if (name === "navigate") {
    const route = (input as { route?: string } | undefined)?.route ?? "…";
    return `Go to ${route}`;
  }
  const target = (input as { target?: string } | undefined)?.target ?? "…";
  return `Highlight “${target}”`;
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
  const label = toolCallLabel(toolName, part.input);

  if (part.state === "input-streaming") {
    return <div className="bart-tool-row bart-muted">{label}…</div>;
  }

  if (part.state === "input-available") {
    if (bart.policies[toolName] === "confirm") {
      return (
        <div className="bart-tool-card">
          <p className="bart-tool-question">Bart wants to: {label}</p>
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
    return <div className="bart-tool-row bart-muted">{label}…</div>;
  }

  if (part.state === "output-available") {
    const output = part.output as BartToolOutput;
    return (
      <div className="bart-tool-row">
        {output.ok ? <CheckIcon /> : <CloseIcon size={12} />}{" "}
        {output.ok ? label : `${label} — ${output.reason ?? "failed"}`}
      </div>
    );
  }

  return (
    <div className="bart-tool-row">
      <CloseIcon size={12} /> {label} — {part.errorText}
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

/** Title row shared by the dock and sidebar shells: brand, new chat, close. */
export function PanelHeader({
  title,
  onNewChat,
  onClose,
}: {
  title: string;
  onNewChat: () => void;
  onClose: () => void;
}) {
  return (
    <header className="bart-panel-header">
      <span className="bart-panel-title">
        <BartIcon /> {title}
      </span>
      <div className="bart-panel-actions">
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
