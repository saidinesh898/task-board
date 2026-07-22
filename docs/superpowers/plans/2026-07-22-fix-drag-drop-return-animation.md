# Fix Drag-and-Drop Return Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a successfully dropped task overlay from animating back toward its previous column while keeping the optimistic cross-column move intact.

**Architecture:** Keep the existing optimistic task update and sortable layout behavior. Disable only dnd-kit's default `DragOverlay` drop animation because its destination measurement can retain the source node when the virtualized card is remounted in another column; the real card already renders in the correct destination from query state.

**Tech Stack:** React 19, Next.js 16 App Router, TypeScript, dnd-kit, TanStack Virtual, Playwright.

---

### Task 1: Reproduce the overlay rollback

**Files:**
- Modify: `tests/e2e/board.spec.ts`

- [x] **Step 1: Add a failing regression test**

```ts
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
  const destination = page.getByRole("heading", { name: "In progress" }).locator("xpath=ancestor::section")
  await source.getByRole("button", { name: `Drag ${title}` }).dragTo(destination)

  expect(await page.locator("html").getAttribute("data-drop-animation")).toBeNull()
  await expect(destination.getByRole("heading", { name: title })).toBeVisible()
})
```

- [x] **Step 2: Run the regression test and verify the current behavior fails**

Run: `npx playwright test tests/e2e/board.spec.ts --grep "does not animate"`

Expected: FAIL because dnd-kit's 250 ms default drop animation sets `data-drop-animation="started"` after a cross-column drop.

### Task 2: Remove the misleading return animation

**Files:**
- Modify: `features/board/board-app.tsx`
- Test: `tests/e2e/board.spec.ts`

- [x] **Step 1: Disable the overlay's default post-drop animation**

```tsx
<DragOverlay dropAnimation={null}>
  {activeTask && (
    <m.div
      initial={{ scale: .98, opacity: .7 }}
      animate={{ scale: 1.02, opacity: 1 }}
      className="w-[360px] rotate-1 shadow-2xl"
    >
      <TaskCard task={activeTask} pending={pendingIds.has(activeTask.id)} onStatusChange={moveTask} />
    </m.div>
  )}
</DragOverlay>
```

- [x] **Step 2: Run the focused regression test**

Run: `npx playwright test tests/e2e/board.spec.ts --grep "does not animate"`

Expected: PASS; the overlay disappears on release and the card is visible in In Progress.

- [x] **Step 3: Run the project verification suite**

Run: `npm test && npm run lint && npm run build && npm run test:e2e`

Expected: all commands pass; lint/build may retain only already-known non-fatal warnings.

- [x] **Step 4: Leave the fix uncommitted for review**

Run: `git diff --check && git status --short`

Expected: no whitespace errors; only the regression test, board fix, plan, and pre-existing user changes are listed.
