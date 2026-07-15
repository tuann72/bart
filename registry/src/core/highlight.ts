import type { BartToolOutput } from "./types";

interface ActiveHighlight {
  overlay: HTMLElement;
  timer: number;
}

let active: ActiveHighlight | null = null;

function liveRegion(): HTMLElement {
  let region = document.getElementById("bart-live-region");
  if (!region) {
    region = document.createElement("div");
    region.id = "bart-live-region";
    region.className = "bart-sr-only";
    region.setAttribute("role", "status");
    region.setAttribute("aria-live", "polite");
    document.body.appendChild(region);
  }
  return region;
}

export function dismissHighlight(): void {
  if (!active) return;
  window.clearTimeout(active.timer);
  active.overlay.remove();
  active = null;
}

/**
 * Highlight an opted-in page element. The target id must already be validated
 * against the manifest; this only locates `data-bart-target` elements and
 * never accepts arbitrary selectors. The overlay is absolutely positioned so
 * it causes no layout shift, and it cleans itself up after `durationMs`.
 */
export function runHighlight(
  targetId: string,
  options?: { durationMs?: number; label?: string },
): BartToolOutput {
  const element = document.querySelector(
    `[data-bart-target="${CSS.escape(targetId)}"]`,
  );
  if (!(element instanceof HTMLElement)) {
    return { ok: false, reason: "target-not-found" };
  }

  dismissHighlight();

  const reducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)",
  ).matches;
  element.scrollIntoView({
    behavior: reducedMotion ? "auto" : "smooth",
    block: "center",
  });

  const rect = element.getBoundingClientRect();
  const pad = 6;
  const overlay = document.createElement("div");
  overlay.className = "bart-highlight-overlay";
  overlay.setAttribute("aria-hidden", "true");
  overlay.style.top = `${rect.top + window.scrollY - pad}px`;
  overlay.style.left = `${rect.left + window.scrollX - pad}px`;
  overlay.style.width = `${rect.width + pad * 2}px`;
  overlay.style.height = `${rect.height + pad * 2}px`;
  document.body.appendChild(overlay);

  liveRegion().textContent =
    options?.label ?? `Highlighted page section: ${targetId}`;

  const timer = window.setTimeout(dismissHighlight, options?.durationMs ?? 4000);
  active = { overlay, timer };
  return { ok: true };
}
