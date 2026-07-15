"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { getToolName, isToolUIPart, type ToolUIPart } from "ai";
import type { BartToolName, UseBartChatReturn } from "../core/use-bart-chat";
import type { BartToolOutput, BartTools, BartUIMessage } from "../core/types";
import { CheckIcon, CloseIcon, SendIcon, StopIcon } from "./icons";

type BartToolPart = ToolUIPart<BartTools>;

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
  const toolName = getToolName(part) as BartToolName;
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
          Ask about this site — try “highlight the pricing table” or “take me
          to the docs”.
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
                <p key={i} className="bart-msg-text">
                  {part.text}
                </p>
              );
            }
            if (isToolUIPart<BartTools>(part)) {
              return <ToolPartView key={part.toolCallId} part={part} bart={bart} />;
            }
            return null;
          })}
        </div>
      ))}
      {bart.status === "submitted" && (
        <div className="bart-typing" aria-label="Bart is thinking">
          <span />
          <span />
          <span />
        </div>
      )}
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
