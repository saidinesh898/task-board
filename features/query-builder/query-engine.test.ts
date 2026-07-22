import { describe, expect, it } from "vitest"
import { makeSeedTasks } from "@/features/tasks/seed"
import { appendQueryNode, compileTaskQuery, decodeQuery, encodeQuery, readQueryParams, removeQueryNode, updateQueryNode, writeQueryParams } from "./query-engine"
import type { QueryGroup } from "./types"

const example: QueryGroup = {
  kind: "group", id: "root", combinator: "or", children: [
    { kind: "group", id: "g1", combinator: "and", children: [
      { kind: "condition", id: "p", field: "priority", operator: "equals", value: "high" },
      { kind: "condition", id: "a", field: "assignee", operator: "equals", value: "You" },
    ] },
    { kind: "group", id: "g2", combinator: "and", children: [
      { kind: "condition", id: "s", field: "status", operator: "equals", value: "done" },
      { kind: "condition", id: "t", field: "tags", operator: "contains", value: "quality" },
    ] },
  ],
}

describe("advanced query engine", () => {
  it("evaluates nested AND/OR groups", () => {
    const results = makeSeedTasks(1000).filter(compileTaskQuery(example))
    expect(results.length).toBeGreaterThan(0)
    expect(results.every((task) => (task.priority === "high" && task.assignee === "You") || (task.status === "done" && task.tags.some((tag) => tag.includes("quality"))))).toBe(true)
  })

  it("round-trips a validated versioned URL payload", () => {
    const encoded = encodeQuery(example)
    expect(encoded).not.toContain("%7B")
    expect(encoded).not.toContain("{")
    expect(decodeQuery(encoded)).toEqual(example)
    expect(decodeQuery(JSON.stringify({ version: 1, query: example }))).toEqual(example)
    expect(decodeQuery('{"version":2}')).toBeNull()
  })

  it("immutably appends, edits, and removes nested nodes", () => {
    const added = appendQueryNode(example, "g1", { kind: "condition", id: "new", field: "title", operator: "contains", value: "auth" })
    const updated = updateQueryNode(added, "new", (node) => ({ ...node, value: "payment" }))
    const removed = removeQueryNode(updated, "new")
    expect(example.children[0]).not.toEqual(added.children[0])
    expect(JSON.stringify(updated)).toContain("payment")
    expect(removed).toEqual(example)
  })

  it("writes readable rules and preserves mixed boolean precedence", () => {
    const params = new URLSearchParams()
    writeQueryParams(example, params)
    expect(params.get("rule1")).toBe("priority.equals.high")
    expect(params.get("rule2")).toBe("assignee.equals.You")
    expect(params.get("logic")).toBe("(1-and-2)-or-(3-and-4)")
    const decoded = readQueryParams(params)
    expect(decoded).not.toBeNull()
    const tasks = makeSeedTasks(1000)
    expect(tasks.filter(compileTaskQuery(decoded!)).map((task) => task.id)).toEqual(tasks.filter(compileTaskQuery(example)).map((task) => task.id))
  })

  it("supports per-rule connectors with AND precedence over OR", () => {
    const flat: QueryGroup = {
      kind: "group", id: "root", combinator: "and", connectors: ["or", "and"], children: [
        { kind: "condition", id: "one", field: "priority", operator: "equals", value: "high" },
        { kind: "condition", id: "two", field: "assignee", operator: "equals", value: "You" },
        { kind: "condition", id: "three", field: "status", operator: "equals", value: "done" },
      ],
    }
    const results = makeSeedTasks(1000).filter(compileTaskQuery(flat))
    expect(results.every((task) => task.priority === "high" || (task.assignee === "You" && task.status === "done"))).toBe(true)
    const params = new URLSearchParams()
    writeQueryParams(flat, params)
    expect(params.get("logic")).toBe("1-or-2-and-3")
  })
})
