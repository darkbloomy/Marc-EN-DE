import { test, expect } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const PROFILE = "cmq3jzhes0000ykr8rnjtbl5u";

function aiAvailable(): boolean {
  if (
    process.env.ANTHROPIC_API_KEY ||
    process.env.ANTHROPIC_VERTEX_BASE_URL ||
    process.env.CLAUDE_CODE_USE_VERTEX
  ) {
    return true;
  }
  try {
    const env = readFileSync(join(__dirname, "..", ".env"), "utf8");
    return /ANTHROPIC_API_KEY|ANTHROPIC_VERTEX_BASE_URL|CLAUDE_CODE_USE_VERTEX/.test(env);
  } catch {
    return false;
  }
}

test.describe("AI tutor chat", () => {
  test.skip(!aiAvailable(), "requires an AI connection");

  async function openChat(page: import("@playwright/test").Page) {
    await page.goto(`/${PROFILE}`);
    await page.getByRole("button", { name: "Ask the AI tutor" }).click();
    await expect(page.getByRole("dialog", { name: "AI tutor" })).toBeVisible();
  }

  test("answers a grammar question in the chat window", async ({ page }) => {
    test.setTimeout(90_000);
    await openChat(page);

    const input = page.locator('textarea[placeholder^="Ask or request"]');
    await input.fill("What is the simple past in English?");
    await page.getByRole("button", { name: "Send" }).click();

    const bubbles = page.locator("div.whitespace-pre-wrap.bg-gray-100");
    await expect(bubbles.first()).toBeVisible({ timeout: 60_000 });
    const text = (await bubbles.first().innerText()).trim();
    expect(text.length).toBeGreaterThan(10);
  });

  test("plan card starts a custom practice session", async ({ page }) => {
    test.setTimeout(180_000);
    await openChat(page);

    const input = page.locator('textarea[placeholder^="Ask or request"]');
    await input.fill("Generate 5 exercises for English simple past");
    await page.getByRole("button", { name: "Send" }).click();

    const planCard = page.getByText("Practice Plan", { exact: true });
    await expect(planCard).toBeVisible({ timeout: 90_000 });
    const startButton = page.getByRole("button", { name: /Start \(/ });
    await expect(startButton).toBeVisible();

    await startButton.click();

    await expect(page.getByPlaceholder("...").first()).toBeVisible({
      timeout: 90_000,
    });
    await expect(page.getByRole("button", { name: "Check Answer" })).toBeVisible();
  });
});
