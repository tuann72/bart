"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../core/focus-trap";
import { shouldTriggerShortcut } from "../core/shortcut";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import type { BartUIMessage } from "../core/types";
import { ChatInput, MessageList } from "./chat-parts";

/** Last user message plus everything after it — the current exchange. */
function lastExchange(messages: BartUIMessage[]): BartUIMessage[] {
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  return lastUserIndex === -1 ? messages : messages.slice(lastUserIndex);
}

export function BartSpotlight({
  bart,
  open,
  onOpenChange,
  title = "Bart",
  shortcutKey = "/",
}: {
  bart: UseBartChatReturn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  shortcutKey?: string;
}) {
  const [showHistory, setShowHistory] = useState(false);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, open);

  // Track what had focus before opening (shortcut or selection popup) and
  // restore it on close, however the open state was toggled.
  useEffect(() => {
    if (open && !wasOpen.current) {
      wasOpen.current = true;
    } else if (!open && wasOpen.current) {
      wasOpen.current = false;
      restoreRef.current?.focus();
      restoreRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!open && shouldTriggerShortcut(event, shortcutKey)) {
        event.preventDefault();
        rememberFocus();
        onOpenChange(true);
        return;
      }
      if (open && event.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, shortcutKey, onOpenChange]);

  const rememberFocus = () => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  if (!open) {
    return (
      <p
        className="bart-spotlight-hint bart-muted"
        data-bart-ui="spotlight-hint"
        aria-hidden="true"
      >
        Press <kbd className="bart-kbd">{shortcutKey}</kbd> to ask {title}
      </p>
    );
  }

  const visible = showHistory ? bart.messages : lastExchange(bart.messages);

  return (
    <div className="bart-spotlight-root" data-bart-ui="spotlight">
      <div
        className="bart-spotlight-backdrop"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-label={`${title} assistant`}
        className="bart-spotlight-container"
      >
        <div className="bart-glass bart-spotlight-inputcard">
          <ChatInput
            bart={bart}
            autoFocus
            placeholder={`Ask ${title} anything…`}
            className="bart-spotlight-input"
          />
          <div className="bart-spotlight-meta">
            {bart.messages.length > 0 && (
              <button
                type="button"
                className="bart-btn-ghost"
                onClick={() => setShowHistory((v) => !v)}
              >
                {showHistory ? "Latest only" : "Show conversation"}
              </button>
            )}
            <span className="bart-muted">
              <kbd className="bart-kbd">Esc</kbd> to close
            </span>
          </div>
        </div>
        {visible.length > 0 && (
          <div className="bart-glass bart-spotlight-results">
            <MessageList bart={bart} messages={visible} />
          </div>
        )}
      </div>
    </div>
  );
}
