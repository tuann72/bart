import { Hono } from "hono";
import { createBartHandler } from "@bart-ui/registry/server";
import { serverManifest } from "./manifest";
import { mockModel } from "./mock-model";

const bartHandler = createBartHandler({
  model: mockModel,
  manifest: serverManifest,
  system:
    "You are the friendly customer guide for Stackhouse Burger Co., a fictional neighborhood burger restaurant.",
  // The Vite dev server proxies /api here, so the browser origin differs
  // from this server's own origin and must be allowlisted explicitly.
  allowedOrigins: ["http://localhost:5173", "http://127.0.0.1:5173"],
});

const app = new Hono();

app.get("/api/health", (c) => c.json({ ok: true }));
app.post("/api/bart", (c) => bartHandler(c.req.raw));

console.log(
  "Bart playground API (scripted mock) listening on http://localhost:8787",
);

export default {
  port: 8787,
  fetch: app.fetch,
};
