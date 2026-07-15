"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useFocusTrap } from "../core/focus-trap";
import { motionDisabled } from "../core/motion";
import { useResizeDrag } from "../core/use-resize-drag";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import { ChatPanel } from "./chat-parts";
import { BartIcon, CloseIcon, RefreshIcon } from "./icons";

const DEFAULT_DOCK_SIZE = { width: 384, height: 448 };
const MIN_DOCK_SIZE = { width: 320, height: 320 };
const MAX_DOCK_SIZE = { width: 512, height: 832 };

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

function dockSizeLimits() {
  return {
    width: Math.min(MAX_DOCK_SIZE.width, window.innerWidth - 32),
    height: Math.min(MAX_DOCK_SIZE.height, window.innerHeight * 0.92),
  };
}

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
  const [size, setSize] = useState(DEFAULT_DOCK_SIZE);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStart = useRef(DEFAULT_DOCK_SIZE);
  const restoreFocusRef = useRef(false);
  const showPanel = open || closing;
  useFocusTrap(panelRef, showPanel);

  const finishClose = () => {
    setClosing(false);
    onOpenChange(false);
    restoreFocusRef.current = true;
  };

  // The tab is unmounted while the panel is open, so it can only take focus once
  // the closing commit has put it back — calling focus() inside finishClose()
  // targets a ref that is still null and silently does nothing.
  useEffect(() => {
    if (showPanel || !restoreFocusRef.current) return;
    restoreFocusRef.current = false;
    launcherRef.current?.focus();
  }, [showPanel]);

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

  const resizeTo = (width: number, height: number) => {
    const limits = dockSizeLimits();
    setSize({
      width: clamp(width, MIN_DOCK_SIZE.width, limits.width),
      height: clamp(height, MIN_DOCK_SIZE.height, limits.height),
    });
  };

  const handleProps = useResizeDrag(() => {
    const bounds = panelRef.current?.getBoundingClientRect();
    if (bounds) dragStart.current = { width: bounds.width, height: bounds.height };
  });

  // The dock is anchored to its outside corner, so the panel grows toward the
  // middle of the page: dragging the inner edge outward is what makes it wider.
  const widthFrom = (dx: number) =>
    dragStart.current.width + (side === "right" ? -dx : dx);
  const heightFrom = (dy: number) => dragStart.current.height - dy;

  const cornerCursor = side === "right" ? "nwse" : "nesw";
  const corner = handleProps(cornerCursor, (dx, dy) =>
    resizeTo(widthFrom(dx), heightFrom(dy)),
  );
  const topEdge = handleProps("ns", (_dx, dy) =>
    resizeTo(dragStart.current.width, heightFrom(dy)),
  );
  const sideEdge = handleProps("ew", (dx) =>
    resizeTo(widthFrom(dx), dragStart.current.height),
  );

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 32 : 16;
    let widthDelta = 0;
    let heightDelta = 0;
    if (event.key === "ArrowUp") heightDelta = step;
    if (event.key === "ArrowDown") heightDelta = -step;
    if (event.key === "ArrowLeft") widthDelta = side === "right" ? step : -step;
    if (event.key === "ArrowRight") widthDelta = side === "right" ? -step : step;
    if (widthDelta === 0 && heightDelta === 0) return;
    event.preventDefault();
    resizeTo(size.width + widthDelta, size.height + heightDelta);
  };

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
        <BartIcon /> {title}
      </button>
    );
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-label={`${title} assistant`}
      data-bart-ui="dock-panel"
      className={`bart-glass bart-dock-panel ${sideClass}${closing ? " bart-closing" : ""}`}
      style={{ width: size.width, height: size.height }}
      onAnimationEnd={onPanelAnimationEnd}
    >
      <button
        type="button"
        className="bart-resize-handle bart-dock-resize"
        aria-label="Resize chat panel"
        onKeyDown={resizeWithKeyboard}
        {...corner}
      />
      {/* Pointer-only, so they stay out of the tab order: the corner button
          above already resizes both axes from the keyboard, and two extra tab
          stops that each do less would only pad the traversal. */}
      <div
        aria-hidden="true"
        className="bart-resize-handle bart-dock-edge bart-dock-edge-top"
        {...topEdge}
      />
      <div
        aria-hidden="true"
        className="bart-resize-handle bart-dock-edge bart-dock-edge-side"
        {...sideEdge}
      />
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
  );
}
