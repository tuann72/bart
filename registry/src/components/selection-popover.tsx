"use client";

import { useEffect, useState } from "react";
import { normalizeSelection } from "../core/selection";
import { BartIcon } from "./icons";

interface PopoverState {
  x: number;
  y: number;
  text: string;
}

function eligibleSelection(): { text: string; rect: DOMRect } | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    return null;
  }
  const range = selection.getRangeAt(0);
  // Never offer the popup for text selected inside Bart's own UI.
  const container =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  if (container?.closest("[data-bart-ui]")) return null;
  const text = normalizeSelection(selection.toString());
  if (!text) return null;
  const rect = range.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { text, rect };
}

/**
 * Floating "Ask Bart" button shown above a text selection. Rendered once by
 * BartChat; `onAsk` receives the selected text (already normalized/capped).
 */
export function BartSelectionPopover({
  onAsk,
  title = "Bart",
}: {
  onAsk: (text: string) => void;
  title?: string;
}) {
  const [popover, setPopover] = useState<PopoverState | null>(null);

  useEffect(() => {
    // Selections are inspected after pointer/keyboard interaction settles,
    // not on every selectionchange, so the popup doesn't flicker mid-drag.
    const update = () => {
      const found = eligibleSelection();
      if (!found) {
        setPopover(null);
        return;
      }
      setPopover({
        x: found.rect.left + found.rect.width / 2,
        y: found.rect.top,
        text: found.text,
      });
    };
    const onPointerUp = () => requestAnimationFrame(update);
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setPopover(null);
        return;
      }
      if (event.shiftKey || event.key === "Shift") requestAnimationFrame(update);
    };
    const onSelectionChange = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed) setPopover(null);
    };
    document.addEventListener("pointerup", onPointerUp);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      document.removeEventListener("pointerup", onPointerUp);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, []);

  if (!popover) return null;

  return (
    <div
      data-bart-ui="selection-popover"
      className="bart-selection-popover"
      style={{ left: popover.x, top: popover.y }}
    >
      <button
        type="button"
        className="bart-btn-primary"
        // Keep the selection alive: mousedown would collapse it before click.
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          setPopover(null);
          window.getSelection()?.removeAllRanges();
          onAsk(popover.text);
        }}
      >
        <BartIcon /> Ask {title}
      </button>
    </div>
  );
}
