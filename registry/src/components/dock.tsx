"use client";

import { useEffect, useRef, useState, type AnimationEvent } from "react";
import { useFocusTrap } from "../core/focus-trap";
import { motionDisabled } from "../core/motion";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import { ChatPanel } from "./chat-parts";
import { BartIcon, CloseIcon } from "./icons";

export function BartDock({
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

  const sideClass = side === "left" ? "bart-dock-left" : "bart-dock-right";

  if (!showPanel) {
    return (
      <button
        ref={launcherRef}
        type="button"
        data-bart-ui="dock-tab"
        className={`bart-dock-tab ${sideClass}`}
        aria-expanded="false"
        aria-haspopup="dialog"
        onClick={() => onOpenChange(true)}
      >
        <BartIcon /> Ask {title}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${title} assistant`}
      data-bart-ui="dock-panel"
      className={`bart-dock-panel ${sideClass}${closing ? " bart-closing" : ""}`}
      onAnimationEnd={onPanelAnimationEnd}
    >
      <header className="bart-panel-header">
        <span className="bart-panel-title">
          <BartIcon /> {title}
        </span>
        <button
          type="button"
          className="bart-icon-btn"
          aria-label="Close chat"
          onClick={close}
        >
          <CloseIcon />
        </button>
      </header>
      <ChatPanel bart={bart} />
    </div>
  );
}
