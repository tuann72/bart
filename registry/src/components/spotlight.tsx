"use client";

import { useEffect, useRef, useState } from "react";
import { useFocusTrap } from "../core/focus-trap";
import { shouldTriggerShortcut } from "../core/shortcut";
import { useShellLifecycle } from "../core/use-shell-lifecycle";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import type { BartUIMessage } from "../core/types";
import type { ReactNode } from "react";
import type { BartAppearance } from "../core/types";
import {
  AutoApproveToggle,
  ChatInput,
  MessageList,
  surfaceClass,
} from "./chat-parts";
import { BartIcon, RefreshIcon } from "./icons";

/** Last user message plus everything after it — the current exchange. */
function lastExchange(messages: BartUIMessage[]): BartUIMessage[] {
  const lastUserIndex = messages.findLastIndex((m) => m.role === "user");
  return lastUserIndex === -1 ? messages : messages.slice(lastUserIndex);
}

export interface BartSpotlightProps {
  bart: UseBartChatReturn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  shortcutKey?: string;
  appearance?: BartAppearance;
  /** Brand mark shown in the closed-state hint. Defaults to the Bart ring. */
  icon?: ReactNode;
}

export function BartSpotlight({
  bart,
  open,
  onOpenChange,
  title = "Bart",
  shortcutKey = "/",
  appearance = "default",
  icon = <BartIcon />,
}: BartSpotlightProps) {
  const [showHistory, setShowHistory] = useState(false);
  const restoreRef = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { showPanel, closing, close, panelAnimationEnd } = useShellLifecycle({
    open,
    onOpenChange,
  });
  useFocusTrap(containerRef, showPanel);

  // The spotlight has no launcher, so it restores focus to whatever held it
  // before opening (shortcut or selection popup), however open was toggled.
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
      if (!showPanel && shouldTriggerShortcut(event, shortcutKey)) {
        event.preventDefault();
        restoreRef.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        onOpenChange(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showPanel, shortcutKey, onOpenChange]);

  if (!showPanel) {
    return (
      <p
        className="bart-spotlight-hint bart-muted"
        data-bart-ui="spotlight-hint"
        aria-hidden="true"
      >
        {icon} Press <kbd className="bart-kbd">{shortcutKey}</kbd> to ask{" "}
        {title}
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
        onAnimationEnd={panelAnimationEnd}
      >
        <div className={`${surfaceClass(appearance)} bart-spotlight-inputcard`}>
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
            <div className="bart-spotlight-actions">
              <AutoApproveToggle bart={bart} label />
              {bart.messages.length > 0 && (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
        {visible.length > 0 && (
          <div className={`${surfaceClass(appearance)} bart-spotlight-results`}>
            <MessageList bart={bart} messages={visible} />
          </div>
        )}
      </div>
    </div>
  );
}
