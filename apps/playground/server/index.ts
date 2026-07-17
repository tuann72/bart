import { createBartHandler } from "@bart-ui/registry/server";
import { serverManifest } from "./manifest";
import { mockModel } from "./mock-model";

export const handler = createBartHandler({
  model: mockModel,
  manifest: serverManifest,
  system:
    "You are the friendly customer guide for Stackhouse Burger Co., a fictional neighborhood burger restaurant.",
});

export const health = { ok: true, provider: "scripted-mock" };
