import { test, expect } from "@playwright/test";

test("homepage tells the story and has no horizontal overflow", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("old code");
  await expect(page.getByText("CVE-2026-109618").first()).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
});

test("PHP version checker", async ({ page }) => {
  await page.goto("/research/php2shell");
  await page.getByRole("button", { name: "8.4.x" }).first().click();
  await page.getByLabel(/Patch number/).first().fill("26");
  await expect(page.getByText("UPDATE REQUIRED").first()).toBeVisible();
  await page.getByLabel(/Patch number/).first().fill("27");
  await expect(page.getByText("PATCHED").first()).toBeVisible();
});

test("whitepaper renders all sections", async ({ page }) => {
  await page.goto("/whitepaper");
  await expect(page.getByRole("heading", { name: "Limitations" })).toBeVisible();
});

test("live view connects and labels demo events", async ({ page }) => {
  await page.goto("/live");
  await expect(page.getByText("LIVE").first()).toBeVisible();
  await expect(page.getByText("DEMO").first()).toBeVisible({ timeout: 15_000 });
});

test("proof page never shows DEMO", async ({ page }) => {
  await page.goto("/proof");
  await expect(page.locator("main")).not.toContainText("demo-org/");
});

test("CVE page and status", async ({ page }) => {
  await page.goto("/cve/CVE-2026-109618");
  await expect(page.getByText("Provenance")).toBeVisible();
  await page.goto("/status");
  await expect(page.getByText("Services")).toBeVisible();
});

test("opt-in flow validates policy", async ({ page }) => {
  await page.goto("/protect");
  await expect(page.getByText("VALID POLICY")).toBeVisible();
  await page.getByLabel(".patchbot").fill("version: 1\nenabled: true\nrun: rm -rf /\n");
  await expect(page.getByText("VALID POLICY")).toHaveCount(0);
});
