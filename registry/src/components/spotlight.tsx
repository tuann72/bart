"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { useFocusTrap } from "../core/focus-trap";
import { motionDisabled } from "../core/motion";
import { shouldTriggerShortcut } from "../core/shortcut";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import type { BartUIMessage } from "../core/types";
import { ChatInput, MessageList } from "./chat-parts";
import { RefreshIcon } from "./icons";

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
  const [closing, setClosing] = useState(false);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const showPanel = open || closing;
  useFocusTrap(containerRef, showPanel);

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

  const finishClose = () => {
    setClosing(false);
    onOpenChange(false);
  };

  const close = () => {
    if (closing) return;
    if (motionDisabled()) {
      finishClose();
      return;
    }
    setClosing(true);
  };

  const onContainerAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === event.currentTarget) finishClose();
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!showPanel && shouldTriggerShortcut(event, shortcutKey)) {
        event.preventDefault();
        rememberFocus();
        onOpenChange(true);
        return;
      }
      if (open && event.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closing, showPanel, shortcutKey, onOpenChange]);

  const rememberFocus = () => {
    restoreRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
  };

  if (!showPanel) {
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
        className={`bart-spotlight-backdrop${closing ? " bart-closing" : ""}`}
        aria-hidden="true"
        onClick={close}
      />
      <div
        ref={containerRef}
        role="dialog"
        aria-label={`${title} assistant`}
        className={`bart-spotlight-container${closing ? " bart-closing" : ""}`}
        onAnimationEnd={onContainerAnimationEnd}
      >
        <div className="bart-glass bart-spotlight-inputcard">
          <ChatInput
            bart={bart}
            autoFocus
            placeholder={`Ask ${title} anything…`}
            className="bart-spotlight-input"
          />
          <div className="bart-spotlight-meta">
            <span className="bart-muted">
              <kbd className="bart-kbd">Esc</kbd> to close
            </span>
            {bart.messages.length > 0 && (
              <div className="bart-spotlight-actions">
                <button
                  type="button"
                  className="bart-btn-ghost"
                  onClick={() => setShowHistory((v) => !v)}
                >
                  {showHistory ? "Latest only" : "Show conversation"}
                </button>
                <button
                  type="button"
                  className="bart-btn-ghost"
                  onClick={() => {
                    bart.reset();
                    setShowHistory(false);
                  }}
                >
                  <RefreshIcon size={12} /> New chat
                </button>
              </div>
            )}
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
