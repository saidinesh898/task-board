import { describe, expect, it } from "vitest"
import { makeSeedTasks } from "../seed"
import {
  createPendingOperation,
  prepareForReconnect,
  SIMULATED_NETWORK_DELAY_MS,
} from "./offline-queue"

describe("offline operation queue", () => {
  it("persists an optimistic snapshot and marks offline work", () => {
    const before = makeSeedTasks(1)[0]
    const now = Date.parse("2026-07-29T10:00:00.000Z")
    const after = { ...before, title: "Edited offline" }

    const operation = createPendingOperation({
      before,
      after,
      label: "Edit task",
      kind: "update",
      actor: "You",
      outcome: "success",
      recordHistory: true,
      connected: false,
      id: "operation-1",
      now,
    })

    expect(operation.id).toBe("operation-1")
    expect(operation.after?.title).toBe("Edited offline")
    expect(operation.after?.updatedAt).toBe(
      "2026-07-29T10:00:00.000Z"
    )
    expect(operation.waitForConnection).toBe(true)
    expect(operation.dueAt).toBe(
      now + SIMULATED_NETWORK_DELAY_MS
    )
  })

  it("gives offline work a fresh deadline after reconnect", () => {
    const before = makeSeedTasks(1)[0]
    const operation = createPendingOperation({
      before,
      after: { ...before, title: "Queued" },
      label: "Edit task",
      kind: "update",
      actor: "You",
      outcome: "success",
      recordHistory: true,
      connected: false,
      id: "operation-2",
      now: 1_000,
    })

    const resumed = prepareForReconnect(operation, 10_000)

    expect(resumed.waitForConnection).toBe(false)
    expect(resumed.dueAt).toBe(
      10_000 + SIMULATED_NETWORK_DELAY_MS
    )
  })
})
