"use client";

import { useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { useFocusTrap } from "../core/focus-trap";
import {
  clampSize,
  growthFromPointer,
  keyboardResizeDelta,
  type BartSide,
} from "../core/resize";
import { useResizeDrag } from "../core/use-resize-drag";
import { useShellLifecycle } from "../core/use-shell-lifecycle";
import { useSidebarPush } from "../core/use-sidebar-push";
import type { UseBartChatReturn } from "../core/use-bart-chat";
import type { ReactNode } from "react";
import type { BartAppearance } from "../core/types";
import {
  ChatPanel,
  PanelHeader,
  resolveHeader,
  surfaceClass,
} from "./chat-parts";
import { BartIcon } from "./icons";

/** How the collapsed sidebar invites a click: a vertical edge tab, or a
 *  floating button in the bottom corner. */
export type SidebarLauncher = "tab" | "button";

const MIN_SIDEBAR_WIDTH = 280;
const MAX_SIDEBAR_WIDTH = 640;

export interface BartSidebarProps {
  bart: UseBartChatReturn;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  side?: BartSide;
  launcher?: SidebarLauncher;
  appearance?: BartAppearance;
  /** Brand mark shown in the launcher and header. Defaults to the Bart ring. */
  icon?: ReactNode;
  /** `true`/omitted: standard header. `false`/`null`: none. Node: your own. */
  header?: ReactNode;
  /** Draw the line between the conversation and the input row. Default on. */
  inputSeparator?: boolean;
}

export function BartSidebar({
  bart,
  open,
  onOpenChange,
  title = "Bart",
  side = "right",
  launcher = "tab",
  appearance = "default",
  icon = <BartIcon />,
  header,
  inputSeparator = true,
}: BartSidebarProps) {
  // null until dragged: the panel and the page's push margin both read
  // --bart-sidebar-width, so the CSS default drives them until a resize sets it.
  const [width, setWidth] = useState<number | null>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragStartWidth = useRef(0);
  const { showPanel, closing, close, panelAnimationEnd } = useShellLifecycle({
    open,
    onOpenChange,
    restoreFocusTo: launcherRef,
  });
  useFocusTrap(panelRef, showPanel);
  useSidebarPush({ open, side, width });

  const sideClass = side === "left" ? "bart-side-left" : "bart-side-right";

  const resizeTo = (next: number) => {
    const max = Math.min(MAX_SIDEBAR_WIDTH, window.innerWidth - 64);
    setWidth(clampSize(next, MIN_SIDEBAR_WIDTH, max));
  };

  const handleProps = useResizeDrag(() => {
    const bounds = panelRef.current?.getBoundingClientRect();
    if (bounds) dragStartWidth.current = bounds.width;
  });

  const resizeHandle = handleProps("ew", (dx) =>
    resizeTo(dragStartWidth.current + growthFromPointer(side, dx)),
  );

  const resizeWithKeyboard = (event: ReactKeyboardEvent<HTMLButtonElement>) => {
    const delta = keyboardResizeDelta(event.key, event.shiftKey, side);
    // Height keys pass through untouched: the sidebar is always full-height.
    if (!delta || delta.width === 0) return;
    event.preventDefault();
    const current = width ?? panelRef.current?.getBoundingClientRect().width;
    if (current !== undefined) resizeTo(current + delta.width);
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
            {icon}
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
            {icon}
            <span className="bart-sidebar-tab-label">{title}</span>
          </button>
        ))}
      {showPanel && (
        <div
          ref={panelRef}
          role="dialog"
          aria-label={`${title} assistant`}
          data-bart-ui="sidebar-panel"
          className={`${surfaceClass(appearance)} bart-sidebar-panel ${sideClass}${inputSeparator ? "" : " bart-no-separator"}${closing ? " bart-closing" : ""}`}
          onAnimationEnd={panelAnimationEnd}
        >
          <button
            type="button"
            className="bart-resize-handle bart-sidebar-resize"
            aria-label="Resize chat panel"
            onKeyDown={resizeWithKeyboard}
            {...resizeHandle}
          />
          {resolveHeader(
            header,
            <PanelHeader
              title={title}
              icon={icon}
              bart={bart}
              onClose={close}
            />,
          )}
          <ChatPanel bart={bart} />
        </div>
      )}
    </>
  );
}
