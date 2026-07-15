import { describe, expect, test } from "bun:test";
import {
  appendSelection,
  buildQuotedMessage,
  normalizeSelection,
} from "./selection";

describe("normalizeSelection", () => {
  test("trims and collapses whitespace", () => {
    expect(normalizeSelection("  Free,\n  Pro,\tEnterprise  ")).toBe(
      "Free, Pro, Enterprise",
    );
  });

  test("returns null for empty or whitespace-only selections", () => {
    expect(normalizeSelection("")).toBeNull();
    expect(normalizeSelection("   \n\t ")).toBeNull();
  });

  test("caps long selections with an ellipsis", () => {
    const result = normalizeSelection("a".repeat(50), 10);
    expect(result).toBe(`${"a".repeat(10)}…`);
  });

  test("keeps selections at the cap untouched", () => {
    expect(normalizeSelection("a".repeat(10), 10)).toBe("a".repeat(10));
  });
});

describe("appendSelection", () => {
  test("appends multiple normalized selections", () => {
    expect(appendSelection(["first"], "  second\nitem  ")).toEqual([
      "first",
      "second item",
    ]);
  });

  test("ignores duplicate selections", () => {
    expect(appendSelection(["same text"], "same  text")).toEqual([
      "same text",
    ]);
  });

  test("drops the oldest selection when capped", () => {
    expect(appendSelection(["first", "second"], "third", 2)).toEqual([
      "second",
      "third",
    ]);
  });
});

describe("buildQuotedMessage", () => {
  test("prefixes the quote as a markdown blockquote", () => {
    expect(buildQuotedMessage(["selected text"], "what is this?")).toBe(
      "> selected text\n\nwhat is this?",
    );
  });

  test("quotes every attached selection", () => {
    expect(buildQuotedMessage(["line one", "line two"], "explain")).toBe(
      "> line one\n> line two\n\nexplain",
    );
  });
});
