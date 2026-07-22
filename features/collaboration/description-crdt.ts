export interface DescriptionMergeInput {
  base: string
  mine: string
  theirs: string
  mineActor: string
  theirsActor: string
}

interface TaggedBlock {
  actor: string
  block: string
  index: number
}

function blocks(value: string) {
  return (value.match(/[^.!?\n]+[.!?]?/g) ?? [])
    .map((block) => block.trim())
    .filter(Boolean)
}

function additions(value: string, base: Set<string>, actor: string): TaggedBlock[] {
  return blocks(value)
    .map((block, index) => ({ actor, block, index }))
    .filter(({ block }) => !base.has(block))
}

/**
 * A small sequence CRDT-like merge for human-readable task descriptions.
 * Base blocks use observed-remove semantics and concurrent additions are ordered
 * by actor identity plus their source position, making the result convergent
 * even when the local and remote branches arrive in the opposite order.
 */
export function mergeDescription({ base, mine, theirs, mineActor, theirsActor }: DescriptionMergeInput) {
  const normalizedBase = base.trim()
  const normalizedMine = mine.trim()
  const normalizedTheirs = theirs.trim()
  if (normalizedMine === normalizedTheirs) return normalizedMine
  if (normalizedMine === normalizedBase) return normalizedTheirs
  if (normalizedTheirs === normalizedBase) return normalizedMine

  const baseBlocks = blocks(normalizedBase)
  const mineBlocks = new Set(blocks(normalizedMine))
  const theirBlocks = new Set(blocks(normalizedTheirs))
  const retained = baseBlocks.filter((block) => mineBlocks.has(block) && theirBlocks.has(block))
  const baseSet = new Set(baseBlocks)
  const concurrent = [
    ...additions(normalizedMine, baseSet, mineActor),
    ...additions(normalizedTheirs, baseSet, theirsActor),
  ].sort((left, right) => left.actor.localeCompare(right.actor) || left.index - right.index || left.block.localeCompare(right.block))

  const seen = new Set(retained)
  const merged = [...retained]
  concurrent.forEach(({ block }) => {
    if (!seen.has(block)) {
      seen.add(block)
      merged.push(block)
    }
  })
  return merged.join(" ")
}
