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

test("does not animate a dropped task back to its previous column", async ({ page }) => {
  await page.addInitScript(() => {
    const animate = Element.prototype.animate
    Element.prototype.animate = function (keyframes, options) {
      if (typeof options === "object" && options?.duration === 250) {
        document.documentElement.dataset.dropAnimation = "started"
      }
      return animate.call(this, keyframes, options)
    }
  })
  await page.reload()

  const title = "Implement authentication"
  const source = page.getByRole("heading", { name: "Todo" }).locator("xpath=ancestor::section")
  const destination = page.getByRole("heading", { name: "In Progress" }).locator("xpath=ancestor::section")
  await source.getByRole("button", { name: `Drag ${title}` }).dragTo(destination)

  expect(await page.locator("html").getAttribute("data-drop-animation")).toBeNull()
  await expect(destination.getByRole("heading", { name: title })).toBeVisible()
})

test("moves a task between columns with the keyboard sensor", async ({ page }) => {
  const title = "Implement authentication"
  const source = page.getByRole("heading", { name: "Todo" }).locator("xpath=ancestor::section")
  const destination = page.getByRole("heading", { name: "In Progress" }).locator("xpath=ancestor::section")
  const handle = source.getByRole("button", { name: `Drag ${title}` })

  await handle.focus()
  await page.keyboard.press("Space")
  await page.keyboard.press("ArrowRight")
  await expect(destination).toHaveAttribute("data-drop-active", "true")
  await expect(destination.getByText("Release to move into In Progress")).toBeVisible()
  await page.keyboard.press("Space")

  await expect(source.getByRole("button", { name: `Drag ${title}` })).toHaveCount(0)
  await expect(destination.getByRole("button", { name: `Drag ${title}` })).toHaveCount(2)
})

test("developer tools are the source of remote activity", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  await expect(page.getByText("Emulation", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Trigger update" }).click()
  await expect(page.getByText(/updated .* recently/)).toBeVisible()
})

test("developer tool switches render and move when toggled", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  const simulationSwitch = page.getByRole("switch", { name: "Toggle automatic simulation" })
  const thumb = simulationSwitch.locator('[data-slot="switch-thumb"]')
  const before = await thumb.boundingBox()

  expect(before).not.toBeNull()
  expect(before!.width).toBeGreaterThan(0)
  await simulationSwitch.click()
  await expect(simulationSwitch).toBeChecked()
  await expect.poll(async () => (await thumb.boundingBox())?.x ?? 0).toBeGreaterThan(before!.x + 6)
})

test("shows remote presence and locks a task while another user edits", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  await page.getByRole("button", { name: "Set editing presence" }).click()

  const task = page.getByRole("heading", { name: "Implement authentication" }).first().locator("xpath=ancestor::*[@data-slot='card']")
  await expect(task.getByLabel("Editing: Alex Morgan")).toBeVisible()
  await expect(task.getByText("Locked by Alex Morgan", { exact: true })).toBeVisible()
  await expect(task.getByLabel("Change status for Implement authentication")).toBeDisabled()
  await expect(task.getByRole("button", { name: "Implement authentication is locked by Alex Morgan" })).toBeDisabled()

  await page.getByRole("button", { name: "Release presence" }).click()
  await expect(task.getByText("Locked by Alex Morgan", { exact: true })).not.toBeVisible()
})

test("resolves a description conflict with a manual CRDT-like merge", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  const changedField = page.getByText("Changed field", { exact: true }).locator("..").getByRole("combobox")
  await changedField.click()
  await page.getByRole("option", { name: "Description", exact: true }).click()

  await page.getByRole("heading", { name: "Implement authentication" }).first().click()
  const description = page.getByLabel("Description")
  await description.fill("Add JWT-based authentication and refresh token handling. I added a local note.")
  await page.getByRole("button", { name: "Simulate remote conflict" }).click()
  await expect(page.getByText("Newer remote version", { exact: true })).toBeVisible()
  await page.getByRole("button", { name: "Review and save" }).click()
  await expect(page.getByRole("heading", { name: "Resolve task conflict" })).toBeVisible()
  await page.getByRole("button", { name: "Merge manually" }).click()

  const merged = page.getByLabel("Merged description")
  await expect(merged).toHaveValue(/I added a local note\./)
  await expect(merged).toHaveValue(/(?:Alex|Priya|Jordan) added a note\./)
  await page.getByRole("button", { name: "Save manual merge" }).click()
  await expect(description).toHaveValue(/I added a local note\./)
  await expect(description).toHaveValue(/(?:Alex|Priya|Jordan) added a note\./)
})

test("keeps optimistic changes queued offline and syncs them after reconnect", async ({ page }) => {
  await page.getByText("DEV TOOLS", { exact: true }).click()
  const response = page.getByText("Next response", { exact: true }).locator("..").getByRole("combobox")
  await response.click()
  await page.getByRole("option", { name: "Force next success", exact: true }).click()
  const networkSwitch = page.getByRole("switch", { name: "Simulate offline network" })
  await networkSwitch.click()
  await expect(page.getByText("You are offline.", { exact: true })).toBeVisible()

  await page.getByRole("button", { name: /New task/ }).click()
  await page.getByLabel("Title").fill("Offline queued task")
  await page.getByLabel("Description").fill("This task should survive reconnection")
  await page.getByLabel("Assignee").click()
  await page.getByRole("option", { name: "You", exact: true }).click()
  await page.getByRole("button", { name: "Create task" }).click()
  await expect(page.getByRole("heading", { name: "Offline queued task" })).toBeVisible()
  await expect(page.getByText("1 pending", { exact: true })).toBeVisible()
  await expect(page.getByText("1 queued", { exact: true })).toBeVisible()

  await networkSwitch.click()
  await expect(page.getByText("Connection restored", { exact: true })).toBeVisible()
  await expect(page.getByText("0 pending", { exact: true })).toBeVisible({ timeout: 5_000 })
  await expect(page.getByRole("heading", { name: "Offline queued task" })).toBeVisible()
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
