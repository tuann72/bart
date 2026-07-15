/**
 * Minimal structural type so the suppression logic is testable without a DOM.
 */
export interface ShortcutEventLike {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  defaultPrevented: boolean;
  isComposing?: boolean;
  target: unknown;
}

function isEditableTarget(target: unknown): boolean {
  if (target === null || typeof target !== "object") return false;
  const node = target as {
    tagName?: string;
    isContentEditable?: boolean;
    readOnly?: boolean;
  };
  if (node.isContentEditable) return true;
  const tag = node.tagName?.toUpperCase();
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";
}

/**
 * Whether a keydown should open the spotlight. Never fires while the user is
 * typing in an editable element, composing text, or holding a modifier, so
 * sites that use `/` inside their own inputs keep working.
 */
export function shouldTriggerShortcut(
  event: ShortcutEventLike,
  key = "/",
): boolean {
  if (event.defaultPrevented || event.isComposing) return false;
  if (event.ctrlKey || event.metaKey || event.altKey) return false;
  if (event.key !== key) return false;
  return !isEditableTarget(event.target);
}
