"use client";

import { useState } from "react";
import { useBartChat, type UseBartChatOptions } from "../core/use-bart-chat";
import type { BartVariant } from "../core/types";
import { BartDock } from "./dock";
import { BartSidebar } from "./sidebar";
import { BartSelectionPopover } from "./selection-popover";
import { BartSpotlight } from "./spotlight";

export interface BartChatProps extends UseBartChatOptions {
  variant?: BartVariant;
  title?: string;
  /** Dock/sidebar screen edge. */
  side?: "left" | "right";
  /** Spotlight open key. */
  shortcutKey?: string;
  /** Show an "Ask Bart" popup when page text is selected. Default on. */
  selectionAsk?: boolean;
}

export function BartChat({
  variant = "dock",
  title = "Bart",
  side = "right",
  shortcutKey = "/",
  selectionAsk = true,
  ...chatOptions
}: BartChatProps) {
  const bart = useBartChat(chatOptions);
  const [open, setOpen] = useState(false);

  const askAboutSelection = (text: string) => {
    bart.attachQuote(text);
    setOpen(true);
  };

  const shell =
    variant === "sidebar" ? (
      <BartSidebar
        bart={bart}
        open={open}
        onOpenChange={setOpen}
        title={title}
        side={side}
      />
    ) : variant === "spotlight" ? (
      <BartSpotlight
        bart={bart}
        open={open}
        onOpenChange={setOpen}
        title={title}
        shortcutKey={shortcutKey}
      />
    ) : (
      <BartDock
        bart={bart}
        open={open}
        onOpenChange={setOpen}
        title={title}
        side={side}
      />
    );

  return (
    <>
      {selectionAsk && (
        <BartSelectionPopover title={title} onAsk={askAboutSelection} />
      )}
      {shell}
    </>
  );
}
