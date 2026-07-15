"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { useFocusTrap } from "../core/focus-trap";
import { motionDisabled } from "../core/motion";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import { ChatPanel } from "./chat-parts";
import { BartIcon, CloseIcon, RefreshIcon } from "./icons";

export function BartSidebar({
  bart,
  open,
  onOpenChange,
  title = "Bart",
  side = "right",
}: {
  bart: UseBartChatReturn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  side?: "left" | "right";
}) {
  const [closing, setClosing] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const showPanel = open || closing;
  useFocusTrap(panelRef, showPanel);

  // Push the page aside while open (desktop only — CSS drops the margin on
  // small screens where the panel is full-width). The transition class stays
  // on <body> so opening and closing both animate.
  useEffect(() => {
    document.body.classList.add("bart-sidebar-push");
    return () => document.body.classList.remove("bart-sidebar-push");
  }, []);

  useEffect(() => {
    const cls =
      side === "left" ? "bart-sidebar-push-left" : "bart-sidebar-push-right";
    if (open && !closing) {
      document.body.classList.add(cls);
    } else {
      document.body.classList.remove(cls);
    }
    return () => document.body.classList.remove(cls);
  }, [open, closing, side]);

  const finishClose = () => {
    setClosing(false);
    onOpenChange(false);
    launcherRef.current?.focus();
  };

  const close = () => {
    if (closing) return;
    if (motionDisabled()) {
      finishClose();
      return;
    }
    setClosing(true);
  };

  const onPanelAnimationEnd = (event: AnimationEvent<HTMLDivElement>) => {
    if (closing && event.target === event.currentTarget) finishClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, closing]);

  const sideClass = side === "left" ? "bart-side-left" : "bart-side-right";

  return (
    <>
      {!showPanel && (
        <button
          ref={launcherRef}
          type="button"
          data-bart-ui="sidebar-tab"
          className={`bart-sidebar-tab ${sideClass}`}
          aria-expanded="false"
          aria-haspopup="dialog"
          onClick={() => onOpenChange(true)}
        >
          <BartIcon />
          <span className="bart-sidebar-tab-label">Chat</span>
        </button>
      )}
      {showPanel && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`${title} assistant`}
          data-bart-ui="sidebar-panel"
          className={`bart-sidebar-panel ${sideClass}${closing ? " bart-closing" : ""}`}
          onAnimationEnd={onPanelAnimationEnd}
        >
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
                onClick={bart.reset}
              >
                <RefreshIcon />
              </button>
              <button
                type="button"
                className="bart-icon-btn"
                aria-label="Close chat"
                title="Close chat"
                onClick={close}
              >
                <CloseIcon />
              </button>
            </div>
          </header>
          <ChatPanel bart={bart} />
        </div>
      )}
    </>
  );
}
