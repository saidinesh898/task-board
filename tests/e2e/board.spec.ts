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

test("hydrates without React mismatch warnings", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })
  await page.reload()
  await expect(page.getByRole("heading", { name: "Thomson Reuters Board" })).toBeVisible()
  expect(errors.filter((message) => /hydrated|hydration mismatch|server rendered HTML/i.test(message))).toEqual([])
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

test("builds, shares, and saves an advanced query", async ({ page }) => {
  await page.getByRole("button", { name: /^Advanced/ }).click()
  await expect(page.getByPlaceholder("Disabled while Advanced is active")).toBeDisabled()
  await expect(page.getByLabel("Filter by person")).toBeDisabled()
  await expect(page.getByLabel("Filter by importance")).toBeDisabled()
  await page.getByRole("button", { name: "Add the first condition" }).click()
  await page.getByRole("button", { name: "Rule", exact: true }).click()
  await page.getByRole("button", { name: "Rule", exact: true }).click()
  await page.getByLabel("Connector before rule 2").click()
  await page.getByRole("option", { name: "OR", exact: true }).click()
  await expect(page).toHaveURL(/rule1=priority.equals.high/)
  await expect(page).toHaveURL(/logic=1-or-2-and-3/)
  expect(page.url()).not.toContain("q=")
  await expect(page.getByText("10 of 30", { exact: true })).toBeVisible()

  await page.getByLabel("Favorite query name").fill("High priority")
  await page.getByRole("button", { name: "Save", exact: true }).click()
  await expect(page.getByRole("button", { name: "High priority", exact: true })).toBeVisible()

  const sharedUrl = page.url()
  await page.reload()
  await expect(page).toHaveURL(sharedUrl)
  await expect(page.getByText("10 of 30", { exact: true })).toBeVisible()
  await expect(page.getByRole("button", { name: "High priority", exact: true })).toBeVisible()
})

test("shares normal search and quick filters in the URL", async ({ page }) => {
  await page.getByPlaceholder(/Search title or description/).fill("authentication")
  await expect(page).toHaveURL(/search=authentication/)
  await page.reload()
  await expect(page.getByPlaceholder(/Search title or description/)).toHaveValue("authentication")
})
