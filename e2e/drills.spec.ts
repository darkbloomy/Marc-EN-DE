import { test, expect } from "@playwright/test";

const PROFILE = "cmq3jzhes0000ykr8rnjtbl5u";

async function goToConfirm(page: import("@playwright/test").Page) {
  await page.goto(`/${PROFILE}/practice/drills`);
  await expect(page.getByRole("heading", { name: "Grammar Drills" })).toBeVisible();
  await page.getByRole("button", { name: "By category" }).click();

  const verbRow = page.locator("div.space-y-2").filter({
    has: page.getByText("Verbs (Konjugation)"),
  });
  await verbRow.getByRole("button", { name: "0", exact: true }).click();

  await expect(page.getByText("Total exercises")).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();
  await expect(page.getByRole("heading", { name: "Confirm drills" })).toBeVisible();
}

test("confirm step lets you set 0% multiple choice", async ({ page }) => {
  await goToConfirm(page);
  await expect(page.getByText("Multiple choice", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "0%", exact: true }).click();
  await expect(
    page.getByText("All 5 questions will be fill-in-the-blank."),
  ).toBeVisible();

  await page.getByRole("button", { name: "Generate drills" }).click();
  await expect(page.getByText("Preparing your drills...")).toBeVisible();
  await expect(page.getByPlaceholder("...").first()).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByRole("button", { name: "Check Answer" })).toBeVisible();
});

test("100% multiple choice shows option buttons instead of blanks", async ({
  page,
}) => {
  await goToConfirm(page);
  await page.getByRole("button", { name: "100%", exact: true }).click();
  await expect(
    page.getByText(
      "All 5 questions will be multiple choice (when enough options exist).",
    ),
  ).toBeVisible();
  await page.getByRole("button", { name: "Generate drills" }).click();
  await expect(page.getByRole("button", { name: "Check Answer" })).toBeVisible({
    timeout: 30_000,
  });
  await expect(page.getByPlaceholder("...")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^A\./ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^B\./ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^C\./ })).toBeVisible();
  await expect(page.getByRole("button", { name: /^D\./ })).toBeVisible();
});

test("after finishing, review shows the question, your answer, and the correct answer", async ({
  page,
}) => {
  await goToConfirm(page);
  await page.getByRole("button", { name: "0%", exact: true }).click();
  await page.getByRole("button", { name: "Generate drills" }).click();
  await expect(page.getByPlaceholder("...").first()).toBeVisible({
    timeout: 30_000,
  });

  for (let i = 0; i < 5; i++) {
    const blanks = page.getByPlaceholder("...");
    const count = await blanks.count();
    for (let b = 0; b < count; b++) {
      await blanks.nth(b).fill("xxx");
    }
    await page.getByRole("button", { name: "Check Answer" }).click();
    await page.getByRole("button", { name: "Next", exact: true }).click();
  }

  await expect(page.getByRole("heading", { name: "Session Complete!" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Review" })).toBeVisible();
  await expect(page.getByText("Your answer:").first()).toBeVisible();
  await expect(page.getByText("Correct:").first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Wrong/ })).toBeVisible();
});
