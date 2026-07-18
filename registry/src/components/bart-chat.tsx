"use client";

import type { ReactNode } from "react";
import type { UseBartChatOptions } from "../core/use-bart-chat";
import type {
  BartAppearance,
  BartStarterPrompt,
  BartVariant,
} from "../core/types";
import { BartProvider } from "./bart-provider";
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
  /** Contextual task suggestions shown before the first message. */
  starterPrompts?: readonly BartStarterPrompt[];
}

/**
 * Batteries-included default composition: a `BartProvider` plus one variant
 * shell and the selection popover. Consumers who want to rearrange the pieces
 * (custom header actions, their own layout) can drop the `variant` prop and
 * compose `<BartProvider>` with the shell + parts directly.
 */
export function BartChat({
  variant = "dock",
  // Cosmetic props are forwarded undefined so the provider and shells stay
  // the single source of their defaults (title, side, shortcut key, …).
  title,
  appearance,
  icon,
  side,
  launcher,
  header,
  inputSeparator,
  shortcutKey,
  selectionAsk = true,
  starterPrompts,
  ...chatOptions
}: BartChatProps) {
  const shell =
    variant === "sidebar" ? (
      <BartSidebar
        side={side}
        launcher={launcher}
        header={header}
        inputSeparator={inputSeparator}
      />
    ) : variant === "spotlight" ? (
      <BartSpotlight shortcutKey={shortcutKey} />
    ) : (
      <BartDock side={side} header={header} inputSeparator={inputSeparator} />
    );

  return (
    <BartProvider
      {...chatOptions}
      title={title}
      icon={icon}
      appearance={appearance}
      starterPrompts={starterPrompts}
    >
      {selectionAsk && <BartSelectionPopover />}
      {shell}
    </BartProvider>
  );
}
