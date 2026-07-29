import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
  await page.goto("/interview-guide")
  await expect(
    page.getByRole("heading", { name: "Understand the board. Defend every decision." })
  ).toBeVisible()
})

test("loads without browser runtime errors", async ({ page }) => {
  const errors: string[] = []
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text())
  })

  await page.reload()
  await expect(
    page.getByRole("heading", { name: "Understand the board. Defend every decision." })
  ).toBeVisible()
  expect(errors).toEqual([])
})

test("navigates lessons and persists completion", async ({ page }) => {
  await page.getByRole("button", { name: /Architecture.*14 min/ }).click()
  await expect(
    page.getByRole("heading", { name: "Architecture & rendering" })
  ).toBeVisible()

  await page.getByRole("button", { name: "Mark complete" }).first().click()
  await expect(page.getByRole("button", { name: "Completed" }).first()).toBeVisible()

  await page.reload()
  await page.getByRole("button", { name: /Architecture/ }).first().click()
  await expect(page.getByRole("button", { name: "Completed" }).first()).toBeVisible()
})

test("opens the virtualization lesson and changes the lab geometry", async ({ page }) => {
  await page.getByRole("button", { name: /Virtualization.*20 min/ }).click()
  await expect(page.getByRole("heading", { name: "TanStack Virtual" })).toBeVisible()
  await expect(page.getByText("See virtualization geometry")).toBeVisible()
  await expect(page.getByText("1,000", { exact: true }).first()).toBeVisible()

  const overscan = page.getByRole("slider", { name: /Overscan/ })
  await overscan.fill("8")
  await expect(page.getByText("8 rows")).toBeVisible()
})

test("steps through an optimistic system flow", async ({ page }) => {
  await page.getByRole("button", { name: "Flow lab" }).click()
  await expect(page.getByRole("heading", { name: "Follow state as it moves." })).toBeVisible()
  await expect(page.getByRole("heading", { name: "Validate draft" })).toBeVisible()

  await page.getByRole("button", { name: "Next transition" }).click()
  await expect(page.getByRole("heading", { name: "Build task" })).toBeVisible()

  await page.getByRole("button", { name: /Failure → safe rollback/ }).click()
  await expect(page.getByRole("heading", { name: "Optimistic view" })).toBeVisible()
})

test("reveals and rates an interview answer", async ({ page }) => {
  await page.getByRole("button", { name: "Drill", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Answer first. Reveal second." })).toBeVisible()

  await page.getByRole("button", { name: "Reveal model answer" }).click()
  await expect(page.getByText("Model answer", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Mastered Interview ready" }).click()

  await expect(page.getByText("confidence 0/2")).toBeVisible()
})

test("uses the mobile study navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.reload()

  await page.getByRole("button", { name: "Open study navigation" }).click()
  await expect(page.getByText("Study map", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: /Query engine.*22 min/ }).click()
  await expect(
    page.getByRole("heading", { name: "Query AST, compiler & URL parser" })
  ).toBeVisible()
})
