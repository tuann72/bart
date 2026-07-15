import { describe, expect, test } from "bun:test";
import { shouldTriggerShortcut, type ShortcutEventLike } from "./shortcut";

function event(overrides: Partial<ShortcutEventLike> = {}): ShortcutEventLike {
  return {
    key: "/",
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    defaultPrevented: false,
    isComposing: false,
    target: { tagName: "BODY" },
    ...overrides,
  };
}

describe("shouldTriggerShortcut", () => {
  test("fires on plain / over non-editable targets", () => {
    expect(shouldTriggerShortcut(event())).toBe(true);
  });

  test("ignores other keys", () => {
    expect(shouldTriggerShortcut(event({ key: "k" }))).toBe(false);
  });

  test("supports a remapped key", () => {
    expect(shouldTriggerShortcut(event({ key: "k" }), "k")).toBe(true);
    expect(shouldTriggerShortcut(event(), "k")).toBe(false);
  });

  test.each(["INPUT", "TEXTAREA", "SELECT"])(
    "suppressed while typing in %s",
    (tagName) => {
      expect(shouldTriggerShortcut(event({ target: { tagName } }))).toBe(false);
    },
  );

  test("suppressed in contenteditable elements", () => {
    expect(
      shouldTriggerShortcut(
        event({ target: { tagName: "DIV", isContentEditable: true } }),
      ),
    ).toBe(false);
  });

  test("suppressed with modifiers, composition, or prior handling", () => {
    expect(shouldTriggerShortcut(event({ ctrlKey: true }))).toBe(false);
    expect(shouldTriggerShortcut(event({ metaKey: true }))).toBe(false);
    expect(shouldTriggerShortcut(event({ altKey: true }))).toBe(false);
    expect(shouldTriggerShortcut(event({ isComposing: true }))).toBe(false);
    expect(shouldTriggerShortcut(event({ defaultPrevented: true }))).toBe(false);
  });

  test("null target counts as non-editable", () => {
    expect(shouldTriggerShortcut(event({ target: null }))).toBe(true);
  });
});
