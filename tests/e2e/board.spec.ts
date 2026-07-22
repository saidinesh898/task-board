import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/")
  await expect(page.getByRole("heading", { name: "Thomson Reuters Board" })).toBeVisible()
})

test("opens keyboard help by button and question mark", async ({ page }) => {
  await page.getByRole("button", { name: /Shortcuts/ }).click()
  await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible()
  await page.keyboard.press("Escape")
  await page.keyboard.press("?")
  await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible()
})

test("creates a task optimistically and exposes pending state", async ({ page }) => {
  await page.getByRole("button", { name: /New task/ }).click()
  await page.getByLabel("Title").fill("Optimistic e2e task")
  await page.getByLabel("Description").fill("Visible before the simulated request finishes")
  await page.getByLabel("Assignee").click()
  await page.getByRole("option", { name: "You" }).click()
  await page.getByRole("button", { name: "Create task" }).click()
  await expect(page.getByRole("heading", { name: "Optimistic e2e task" })).toBeVisible()
  await expect(page.getByText("1 pending", { exact: true })).toBeVisible()
  await expect(page.getByText("0 pending", { exact: true })).toBeVisible({ timeout: 4_000 })
})

test("developer tools are the source of remote activity", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  await expect(page.getByText("Emulation", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Trigger update" }).click()
  await expect(page.getByText(/updated .* recently/)).toBeVisible()
})
