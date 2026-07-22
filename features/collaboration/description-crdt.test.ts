import { describe, expect, it } from "vitest"
import { mergeDescription } from "./description-crdt"

describe("description CRDT-like reconciliation", () => {
  it("returns the changed side when the other side is unchanged", () => {
    expect(mergeDescription({
      base: "Base description.",
      mine: "Base description.",
      theirs: "Base description. Alex added a note.",
      mineActor: "You",
      theirsActor: "Alex Morgan",
    })).toBe("Base description. Alex added a note.")
  })

  it("converges concurrent additions regardless of arrival order", () => {
    const first = mergeDescription({
      base: "Base description.",
      mine: "Base description. I added a local note.",
      theirs: "Base description. Alex added a remote note.",
      mineActor: "You",
      theirsActor: "Alex Morgan",
    })
    const second = mergeDescription({
      base: "Base description.",
      mine: "Base description. Alex added a remote note.",
      theirs: "Base description. I added a local note.",
      mineActor: "Alex Morgan",
      theirsActor: "You",
    })

    expect(first).toBe(second)
    expect(first).toContain("Base description.")
    expect(first).toContain("Alex added a remote note.")
    expect(first).toContain("I added a local note.")
  })

  it("uses observed-remove semantics for deleted base blocks", () => {
    expect(mergeDescription({
      base: "Keep this. Remove this.",
      mine: "Keep this.",
      theirs: "Keep this. Remove this. Add this.",
      mineActor: "You",
      theirsActor: "Priya Shah",
    })).toBe("Keep this. Add this.")
  })

  it("deduplicates the same concurrent addition", () => {
    expect(mergeDescription({
      base: "Base.",
      mine: "Base. Shared note.",
      theirs: "Base. Shared note.",
      mineActor: "You",
      theirsActor: "Jordan Lee",
    })).toBe("Base. Shared note.")
  })
})
