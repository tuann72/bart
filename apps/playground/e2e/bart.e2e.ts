import { expect, test, type Page } from "@playwright/test";

/**
 * Full-flow coverage against the playground and its deterministic mock
 * model: real streaming over the wire, approval cards, and the tools' actual
 * DOM effects. Variant-behavior details live in the happy-dom contract
 * suite; this file covers what only a browser can verify.
 */

const dialog = (page: Page) =>
  page.getByRole("dialog", { name: "Bart assistant" });

async function selectVariant(
  page: Page,
  variant: "dock" | "sidebar" | "spotlight",
) {
  await page
    .getByRole("radiogroup", { name: "Bart variant" })
    .getByRole("radio", { name: variant })
    .click();
}

async function sendMessage(page: Page, text: string) {
  await page.getByRole("textbox", { name: "Message Bart" }).fill(text);
  await page.getByRole("button", { name: "Send message" }).click();
}

test("dock streams a markdown answer from the mock model", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Bart", exact: true }).click();
  await sendMessage(page, "How much does the Smoke Show burger cost?");
  await expect(dialog(page).locator("table")).toContainText("Smoke Show");
});

test("every variant opens into a dialog and Escape closes it", async ({
  page,
}) => {
  await page.goto("/");
  for (const variant of ["dock", "sidebar", "spotlight"] as const) {
    await selectVariant(page, variant);
    if (variant === "spotlight") {
      await page.keyboard.press("/");
    } else {
      await page.getByRole("button", { name: "Bart", exact: true }).click();
    }
    await expect(dialog(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
  }
});

test("the spotlight shortcut stays inert while typing in its own input", async ({
  page,
}) => {
  await page.goto("/");
  await selectVariant(page, "spotlight");
  await page.keyboard.press("/");
  const input = page.getByRole("textbox", { name: "Message Bart" });
  await input.pressSequentially("/faq");
  // The keystroke typed text instead of retriggering the shortcut.
  await expect(input).toHaveValue("/faq");
  await expect(dialog(page)).toHaveCount(1);
});

test("the spotlight hint keeps its icon on the text line", async ({ page }) => {
  await page.goto("/");
  await selectVariant(page, "spotlight");
  const hint = page.locator(".bart-spotlight-hint");
  await expect(hint).toBeVisible();
  // Tailwind preflight sets svg { display: block }, which once wrapped the
  // icon onto its own line. Icon and shortcut key must overlap vertically.
  const icon = await hint.locator("svg").boundingBox();
  const key = await hint.locator("kbd").boundingBox();
  if (!icon || !key) throw new Error("hint icon or kbd not rendered");
  expect(icon.y).toBeLessThan(key.y + key.height);
  expect(icon.y + icon.height).toBeGreaterThan(key.y);
});

test("host page centering does not leak into Bart's messages", async ({
  page,
}) => {
  await page.goto("/");
  // The default Vite starter ships `#root { text-align: center }`; Bart's
  // panels must hold `text-align: start` against exactly this kind of host CSS.
  await page.addStyleTag({ content: "#root, body { text-align: center; }" });
  await page.getByRole("button", { name: "Bart", exact: true }).click();
  await sendMessage(page, "How much does the Smoke Show burger cost?");
  const answer = dialog(page).locator(".bart-msg-assistant .bart-markdown p").first();
  await expect(answer).toBeVisible();
  await expect(answer).toHaveCSS("text-align", "start");
});

test("highlight runs without approval and draws the overlay", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Stackhouse navigation" })
    .getByRole("button", { name: "Pricing" })
    .click();
  await page.getByRole("button", { name: "Bart", exact: true }).click();
  await sendMessage(page, "Highlight the combo deals");
  const overlay = page.locator(".bart-highlight-overlay");
  await expect(overlay).toBeVisible();
  // Auto policy: no approval card ever appeared.
  await expect(page.getByRole("button", { name: "Allow" })).toHaveCount(0);
  // The overlay marks page content: it must layer below Bart's own panels.
  const zIndexOf = (locator: ReturnType<Page["locator"]>) =>
    locator.evaluate((el) => Number(getComputedStyle(el).zIndex));
  expect(await zIndexOf(overlay)).toBeLessThan(
    await zIndexOf(page.locator('[data-bart-ui="dock-panel"]')),
  );
});

test("interact asks for approval, then clicks the pricing page button", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Stackhouse navigation" })
    .getByRole("button", { name: "Pricing" })
    .click();
  await page.getByRole("button", { name: "Bart", exact: true }).click();
  await sendMessage(page, "Start a pickup order for me");

  await expect(page.getByText("Bart wants to click “start-order”")).toBeVisible();
  // Nothing happened on the page while approval is pending.
  await expect(page.getByText("Pickup order started")).toHaveCount(0);

  await page.getByRole("button", { name: "Allow" }).click();
  await expect(
    page.getByText("Pickup order started — ready in 15–20 minutes."),
  ).toBeVisible();
  await expect(
    page.getByText("You approved clicking “start-order”"),
  ).toBeVisible();
  await expect(
    page.getByText("Done — your pickup order is started."),
  ).toBeVisible();
});

test("denying an interact call leaves the page untouched", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("navigation", { name: "Stackhouse navigation" })
    .getByRole("button", { name: "Pricing" })
    .click();
  await page.getByRole("button", { name: "Bart", exact: true }).click();
  await sendMessage(page, "Start a pickup order for me");

  await expect(page.getByText("Bart wants to click “start-order”")).toBeVisible();
  await page.getByRole("button", { name: "Deny" }).click();
  await expect(
    page.getByText("You denied clicking “start-order”"),
  ).toBeVisible();
  await expect(page.getByText("Pickup order started")).toHaveCount(0);
});
