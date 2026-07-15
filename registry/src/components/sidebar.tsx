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

/** How the collapsed sidebar invites a click: a vertical edge tab, or a
 *  floating button in the bottom corner. */
export type SidebarLauncher = "tab" | "button";

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 640;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function BartSidebar({
  bart,
  open,
  onOpenChange,
  title = "Bart",
  side = "right",
  launcher = "tab",
}: {
  bart: UseBartChatReturn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  side?: "left" | "right";
  launcher?: SidebarLauncher;
}) {
  const [closing, setClosing] = useState(false);
  // null until dragged: the panel and the page's push margin both read
  // --bart-sidebar-width, so the CSS default drives them until a resize sets it.
  const [width, setWidth] = useState<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartWidth = useRef(0);
  const restoreFocusRef = useRef(false);
  const showPanel = open || closing;
  useFocusTrap(panelRef, showPanel);

  // One variable drives both the panel's width and the body margin that pushes
  // the page aside, so they cannot drift apart mid-drag. It lives on <html> for
  // that reason, and is cleaned up when the sidebar goes away entirely.
  useEffect(() => {
    if (width === null) return;
    document.documentElement.style.setProperty(
      "--bart-sidebar-width",
      `${width}px`,
    );
  }, [width]);

  useEffect(
    () => () => {
      document.documentElement.style.removeProperty("--bart-sidebar-width");
    },
    [],
  );

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
    restoreFocusRef.current = true;
  };

  // The launcher is unmounted while the panel is open, so it can only take focus
  // once the closing commit has put it back — calling focus() inside
  // finishClose() targets a ref that is still null and silently does nothing.
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

  const sideClass = side === "left" ? "bart-side-left" : "bart-side-right";

  const resizeTo = (next: number) => {
    const max = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 64);
    setWidth(clamp(next, MIN_SIDEBAR_WIDTH, max));
  };

  const handleProps = useResizeDrag(() => {
    const bounds = panelRef.current?.getBoundingClientRect();
    if (bounds) dragStartWidth.current = bounds.width;
  });

  // The panel is pinned to its screen edge, so it widens as the handle is
  // dragged toward the middle of the page.
  const resizeHandle = handleProps("ew", (dx) =>
    resizeTo(dragStartWidth.current + (side === "right" ? -dx : dx)),
  );

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const step = event.shiftKey ? 32 : 16;
    let delta = 0;
    if (event.key === "ArrowLeft") delta = side === "right" ? step : -step;
    if (event.key === "ArrowRight") delta = side === "right" ? -step : step;
    if (delta === 0) return;
    event.preventDefault();
    const current = width ?? panelRef.current?.getBoundingClientRect().width;
    if (current !== undefined) resizeTo(current + delta);
  };

  return (
    <>
      {!showPanel &&
        (launcher === "button" ? (
          <button
            ref={launcherRef}
            type="button"
            data-bart-ui="sidebar-button"
            className={`bart-sidebar-button ${sideClass}`}
            aria-expanded="false"
            aria-haspopup="dialog"
            onClick={() => onOpenChange(true)}
          >
            <BartIcon />
            {title}
          </button>
        ) : (
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
            <span className="bart-sidebar-tab-label">{title}</span>
          </button>
        ))}
      {showPanel && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`${title} assistant`}
          data-bart-ui="sidebar-panel"
          className={`bart-glass bart-sidebar-panel ${sideClass}${closing ? " bart-closing" : ""}`}
          onAnimationEnd={onPanelAnimationEnd}
        >
          <button
            type="button"
            className="bart-resize-handle bart-sidebar-resize"
            aria-label="Resize chat panel"
            onKeyDown={resizeWithKeyboard}
            {...resizeHandle}
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
      )}
    </>
  );
}
