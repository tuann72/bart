import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  buildBartConfig,
  detectPackageManager,
  installCommand,
  isProviderId,
  isTemplateFile,
  mergeDependencies,
  PROVIDERS,
} from "./lib";

describe("isTemplateFile", () => {
  test("accepts runtime source by extension", () => {
    expect(isTemplateFile("index.ts")).toBe(true);
    expect(isTemplateFile("components/dock.tsx")).toBe(true);
    expect(isTemplateFile("core/tool-policy.ts")).toBe(true);
    expect(isTemplateFile("styles.css")).toBe(true);
  });

  test("rejects tests, the test preload, and non-source files", () => {
    expect(isTemplateFile("core/resize.test.ts")).toBe(false);
    expect(isTemplateFile("components/variants.contract.test.tsx")).toBe(false);
    expect(isTemplateFile("test-setup.ts")).toBe(false);
    expect(isTemplateFile("nested/test-setup.ts")).toBe(false);
    expect(isTemplateFile("e2e/chat.e2e.ts")).toBe(false);
    expect(isTemplateFile("chat.spec.ts")).toBe(false);
    expect(isTemplateFile("README.md")).toBe(false);
    expect(isTemplateFile("logo.png")).toBe(false);
  });
});

describe("mergeDependencies", () => {
  test("adds missing deps to dependencies", () => {
    const { pkg, added, kept } = mergeDependencies(
      { name: "consumer" },
      { ai: "^5", zod: "^4" },
    );
    expect(pkg.dependencies).toEqual({ ai: "^5", zod: "^4" });
    expect(added).toEqual({ ai: "^5", zod: "^4" });
    expect(kept).toEqual([]);
  });

  test("never overwrites a range the consumer already declares anywhere", () => {
    const { pkg, added, kept } = mergeDependencies(
      {
        dependencies: { ai: "5.2.1" },
        devDependencies: { zod: "^3" },
        peerDependencies: { react: "^19" },
      },
      { ai: "^5", zod: "^4", react: "^19.2.7", hono: "^4" },
    );
    expect(pkg.dependencies).toEqual({ ai: "5.2.1", hono: "^4" });
    expect(pkg.devDependencies).toEqual({ zod: "^3" });
    expect(added).toEqual({ hono: "^4" });
    expect(kept).toEqual(["ai", "zod", "react"]);
  });

  test("does not mutate its input", () => {
    const input = { dependencies: { ai: "^5" } };
    mergeDependencies(input, { zod: "^4" });
    expect(input).toEqual({ dependencies: { ai: "^5" } });
  });
});

describe("detectPackageManager", () => {
  test("picks by lockfile", () => {
    expect(detectPackageManager(["bun.lock", "package.json"])).toBe("bun");
    expect(detectPackageManager(["bun.lockb"])).toBe("bun");
    expect(detectPackageManager(["pnpm-lock.yaml"])).toBe("pnpm");
    expect(detectPackageManager(["yarn.lock"])).toBe("yarn");
    expect(detectPackageManager(["package-lock.json"])).toBe("npm");
    expect(detectPackageManager(["package.json"])).toBe("npm");
  });

  test("install command matches the manager", () => {
    expect(installCommand("bun")).toBe("bun install");
    expect(installCommand("npm")).toBe("npm install");
  });
});

describe("providers", () => {
  test("ids validate and carry adapter + env metadata", () => {
    expect(isProviderId("openai")).toBe(true);
    expect(isProviderId("anthropic")).toBe(true);
    expect(isProviderId("google")).toBe(true);
    expect(isProviderId("none")).toBe(false);
    expect(isProviderId("mistral")).toBe(false);
    for (const info of Object.values(PROVIDERS)) {
      expect(info.pkg).toStartWith("@ai-sdk/");
      expect(info.env.length).toBeGreaterThan(0);
    }
  });

  test("no provider adapter is a dependency of the registry (invariant 12)", () => {
    const registryPkg = JSON.parse(
      readFileSync(
        new URL("../../../registry/package.json", import.meta.url),
        "utf8",
      ),
    ) as { dependencies?: Record<string, string> };
    for (const info of Object.values(PROVIDERS)) {
      expect(registryPkg.dependencies?.[info.pkg]).toBeUndefined();
    }
  });
});

describe("buildBartConfig", () => {
  test("records version, paths, provider, and hashes", () => {
    const config = buildBartConfig("0.1.0", "src/bart", "anthropic", {
      "index.ts": "abc123",
    });
    expect(config).toEqual({
      cli: "0.1.0",
      dir: "src/bart",
      content: "content/bart",
      provider: "anthropic",
      files: { "index.ts": "abc123" },
    });
  });
});
