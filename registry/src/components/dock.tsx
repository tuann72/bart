"use client";

import {
  useEffect,
  useRef,
  useState,
  type AnimationEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { useFocusTrap } from "../core/focus-trap";
import { motionDisabled } from "../core/motion";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import { ChatPanel } from "./chat-parts";
import { BartIcon, CloseIcon } from "./icons";

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
  const resizeRef = useRef<{
    pointerId: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
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

  const resizeTo = (width: number, height: number) => {
    const limits = dockSizeLimits();
    setSize({
      width: clamp(width, MIN_DOCK_SIZE.width, limits.width),
      height: clamp(height, MIN_DOCK_SIZE.height, limits.height),
    });
  };

  const startResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0 || !panelRef.current) return;
    const bounds = panelRef.current.getBoundingClientRect();
    resizeRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      width: bounds.width,
      height: bounds.height,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    event.preventDefault();
  };

  const continueResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const start = resizeRef.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const horizontalDelta =
      side === "right" ? start.x - event.clientX : event.clientX - start.x;
    resizeTo(start.width + horizontalDelta, start.height + start.y - event.clientY);
  };

  const finishResize = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (resizeRef.current?.pointerId !== event.pointerId) return;
    resizeRef.current = null;
    event.currentTarget.releasePointerCapture(event.pointerId);
  };

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
      style={{ width: size.width, height: size.height }}
      onAnimationEnd={onPanelAnimationEnd}
    >
      <button
        type="button"
        className="bart-dock-resize"
        aria-label="Resize chat panel"
        title="Drag to resize chat"
        onPointerDown={startResize}
        onPointerMove={continueResize}
        onPointerUp={finishResize}
        onPointerCancel={finishResize}
        onKeyDown={resizeWithKeyboard}
      />
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
