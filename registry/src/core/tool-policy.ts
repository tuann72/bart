import type {
  BartPublicManifest,
  BartToolOutput,
  BartToolPolicies,
} from "./types";

export const DEFAULT_TOOL_POLICIES: BartToolPolicies = {
  navigate: "confirm",
  highlight: "auto",
};

export function resolveToolPolicies(
  overrides?: Partial<BartToolPolicies>,
): BartToolPolicies {
  return { ...DEFAULT_TOOL_POLICIES, ...overrides };
}

/**
 * Deterministic route allowlisting. Only exact, relative routes present in the
 * generated manifest are accepted, regardless of what the model produced.
 */
export function validateRoute(
  manifest: BartPublicManifest,
  route: unknown,
): BartToolOutput {
  if (typeof route !== "string" || route.length === 0) {
    return { ok: false, reason: "invalid-route" };
  }
  if (!route.startsWith("/") || route.startsWith("//")) {
    return { ok: false, reason: "route-not-relative" };
  }
  if (!manifest.routes.some((r) => r.route === route)) {
    return { ok: false, reason: "unknown-route" };
  }
  return { ok: true };
}

/**
 * A highlight target is valid only when it is registered in the manifest for
 * the page the user is currently on.
 */
export function validateTarget(
  manifest: BartPublicManifest,
  currentRoute: string,
  target: unknown,
): BartToolOutput {
  if (typeof target !== "string" || target.length === 0) {
    return { ok: false, reason: "invalid-target" };
  }
  const page = manifest.routes.find((r) => r.route === currentRoute);
  if (!page) {
    return { ok: false, reason: "unknown-route" };
  }
  if (!page.targets.some((t) => t.id === target)) {
    return { ok: false, reason: "unknown-target" };
  }
  return { ok: true };
}
