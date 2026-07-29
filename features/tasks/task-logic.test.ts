import { describe, expect, it } from "vitest"
import { makeSeedTasks } from "./seed"
import { applyOperationToTasks, reconcilePending } from "./optimistic"
import { filterTasks } from "./selectors"
import { taskSchema, type PendingOperation } from "./types"

describe("task model and filtering", () => {
  it("generates valid deterministic stress data", () => {
    const tasks = makeSeedTasks(1000)
    expect(tasks).toHaveLength(1000)
    expect(taskSchema.safeParse(tasks[999]).success).toBe(true)
    expect(new Set(tasks.map((task) => task.id)).size).toBe(1000)
  })

  it("searches title and description and combines assignee and priority", () => {
    const tasks = makeSeedTasks(30)
    expect(filterTasks(tasks, { search: "JWT", assignee: "all", priority: "all" }).length).toBeGreaterThan(0)
    const filtered = filterTasks(tasks, { search: "authentication", assignee: "You", priority: "high" })
    expect(filtered.every((task) => task.assignee === "You" && task.priority === "high")).toBe(true)
    expect(filtered.some((task) => `${task.title} ${task.description}`.toLowerCase().includes("authentication"))).toBe(true)
  })
})

describe("optimistic reconciliation", () => {
  const makeOperation = (id: string, taskId: string, after: ReturnType<typeof makeSeedTasks>[number]): PendingOperation => ({
    id, taskId, after, before: null, actor: "You", label: "Update", kind: "update",
    outcome: "success", dueAt: 0, recordHistory: true,
  })

  it("replays remaining optimistic changes over confirmed data", () => {
    const confirmed = makeSeedTasks(3)
    const first = confirmed[0]
    const second = confirmed[1]
    const operations = [
      makeOperation("a", first.id, { ...first, title: "Optimistic title" }),
      makeOperation("b", second.id, { ...second, status: "done" }),
    ]
    const visible = reconcilePending(confirmed, operations)
    expect(visible.find((task) => task.id === first.id)?.title).toBe("Optimistic title")
    expect(visible.find((task) => task.id === second.id)?.status).toBe("done")
  })

  it("removes an optimistic creation when applying its inverse", () => {
    const confirmed = makeSeedTasks(1)
    const created = { ...confirmed[0], id: "new-task", title: "New task" }
    const withCreate = applyOperationToTasks(confirmed, { taskId: created.id, after: created })
    expect(withCreate).toHaveLength(2)
    expect(applyOperationToTasks(withCreate, { taskId: created.id, after: null })).toEqual(confirmed)
  })
})

