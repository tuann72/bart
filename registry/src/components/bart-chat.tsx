"use client";

import { useState, type ReactNode } from "react";
import { useBartChat, type UseBartChatOptions } from "../core/use-bart-chat";
import type { BartAppearance, BartVariant } from "../core/types";
import { BartDock } from "./dock";
import { BartSidebar, type SidebarLauncher } from "./sidebar";
import { BartSelectionPopover } from "./selection-popover";
import { BartSpotlight } from "./spotlight";

export interface BartChatProps extends UseBartChatOptions {
  variant?: BartVariant;
  /** The shell's display name: header/launcher text and aria labels. */
  title?: string;
  /** Surface finish: opaque `"default"` or backdrop-blur `"glass"`. */
  appearance?: BartAppearance;
  /** Brand mark next to the title everywhere one is shown. Any node. */
  icon?: ReactNode;
  /** Dock/sidebar screen edge. */
  side?: "left" | "right";
  /** Sidebar launcher: a vertical edge tab, or a floating corner button. */
  launcher?: SidebarLauncher;
  /** Dock/sidebar header: `true`/omitted standard, `false` none, node custom. */
  header?: ReactNode;
  /** Dock/sidebar line between the conversation and the input. Default on. */
  inputSeparator?: boolean;
  /** Spotlight open key. */
  shortcutKey?: string;
  /** Show an "Ask Bart" popup when page text is selected. Default on. */
  selectionAsk?: boolean;
}

export function BartChat({
  variant = "dock",
  title = "Bart",
  appearance = "default",
  icon,
  side = "right",
  launcher = "tab",
  header,
  inputSeparator = true,
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
        launcher={launcher}
        appearance={appearance}
        icon={icon}
        header={header}
        inputSeparator={inputSeparator}
      />
    ) : variant === "spotlight" ? (
      <BartSpotlight
        bart={bart}
        open={open}
        onOpenChange={setOpen}
        title={title}
        shortcutKey={shortcutKey}
        appearance={appearance}
        icon={icon}
      />
    ) : (
      <BartDock
        bart={bart}
        open={open}
        onOpenChange={setOpen}
        title={title}
        side={side}
        appearance={appearance}
        icon={icon}
        header={header}
        inputSeparator={inputSeparator}
      />
    );

  return (
    <>
      {selectionAsk && (
        <BartSelectionPopover
          title={title}
          icon={icon}
          onAsk={askAboutSelection}
        />
      )}
      {shell}
    </>
  );
}
