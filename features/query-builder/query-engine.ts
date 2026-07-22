import type { Task } from "@/features/tasks/types"
import { createEmptyQuery, queryFieldSchema, queryOperatorSchema, queryPayloadSchema, type QueryCondition, type QueryGroup, type QueryNode } from "./types"

export function countConditions(node: QueryNode): number {
  return node.kind === "condition" ? 1 : node.children.reduce((count, child) => count + countConditions(child), 0)
}

export function updateQueryNode(root: QueryGroup, id: string, update: (node: QueryNode) => QueryNode): QueryGroup {
  const visit = (node: QueryNode): QueryNode => {
    if (node.id === id) return update(node)
    return node.kind === "group" ? { ...node, children: node.children.map(visit) } : node
  }
  return visit(root) as QueryGroup
}

export function appendQueryNode(root: QueryGroup, groupId: string, child: QueryNode): QueryGroup {
  return updateQueryNode(root, groupId, (node) => node.kind === "group" ? {
    ...node,
    children: [...node.children, child],
    connectors: node.children.length ? [...(node.connectors ?? Array(Math.max(0, node.children.length - 1)).fill(node.combinator)), node.combinator] : [],
  } : node)
}

export function removeQueryNode(root: QueryGroup, id: string): QueryGroup {
  const visit = (group: QueryGroup): QueryGroup => {
    const removedIndex = group.children.findIndex((child) => child.id === id)
    if (removedIndex >= 0) {
      const connectors = group.connectors ?? Array(Math.max(0, group.children.length - 1)).fill(group.combinator)
      const remainingConnectors = connectors.filter((_, index) => index !== (removedIndex === 0 ? 0 : removedIndex - 1))
      return {
        ...group,
        children: group.children.filter((child) => child.id !== id),
        connectors: remainingConnectors.every((connector) => connector === group.combinator) ? undefined : remainingConnectors,
      }
    }
    return { ...group, children: group.children.map((child) => child.kind === "group" ? visit(child) : child) }
  }
  return id === root.id ? createEmptyQuery() : visit(root)
}

function conditionMatches(task: Task, condition: QueryCondition) {
  const queryValue = condition.value.trim().toLocaleLowerCase()
  if (!queryValue) return true
  const raw = task[condition.field]
  const values = Array.isArray(raw) ? raw.map(String) : [String(raw)]
  const normalized = values.map((value) => value.toLocaleLowerCase())
  const equals = normalized.some((value) => value === queryValue)
  const contains = normalized.some((value) => value.includes(queryValue))
  if (condition.operator === "equals") return equals
  if (condition.operator === "not-equals") return !equals
  if (condition.operator === "contains") return contains
  return !contains
}

export function compileTaskQuery(query: QueryGroup): (task: Task) => boolean {
  const compile = (node: QueryNode): ((task: Task) => boolean) => {
    if (node.kind === "condition") return (task) => conditionMatches(task, node)
    const children = node.children.map(compile)
    if (!children.length) return () => true
    const connectors = node.connectors ?? Array(Math.max(0, children.length - 1)).fill(node.combinator)
    // AND binds more tightly than OR: A OR B AND C becomes A OR (B AND C).
    const clauses: Array<Array<(task: Task) => boolean>> = [[]]
    children.forEach((predicate, index) => {
      if (index > 0 && connectors[index - 1] === "or") clauses.push([])
      clauses.at(-1)!.push(predicate)
    })
    return (task) => clauses.some((clause) => clause.every((predicate) => predicate(task)))
  }
  return compile(query)
}

export function encodeQuery(query: QueryGroup) {
  const json = JSON.stringify({ version: 1, query })
  const bytes = new TextEncoder().encode(json)
  let binary = ""
  bytes.forEach((byte) => { binary += String.fromCharCode(byte) })
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "")
}

export function decodeQuery(value: string | null): QueryGroup | null {
  if (!value) return null
  try {
    // Accept the original JSON format so previously shared URLs keep working.
    const json = value.startsWith("{") ? value : (() => {
      const base64 = value.replaceAll("-", "+").replaceAll("_", "/").padEnd(Math.ceil(value.length / 4) * 4, "=")
      const binary = atob(base64)
      return new TextDecoder().decode(Uint8Array.from(binary, (character) => character.charCodeAt(0)))
    })()
    return queryPayloadSchema.parse(JSON.parse(json)).query
  } catch {
    return null
  }
}

export function writeQueryParams(query: QueryGroup, params: URLSearchParams) {
  for (const key of [...params.keys()]) {
    if (/^rule\d+$/.test(key) || key === "logic" || key === "q") params.delete(key)
  }
  let ruleNumber = 0
  const visit = (node: QueryNode): string => {
    if (node.kind === "condition") {
      ruleNumber += 1
      params.set(`rule${ruleNumber}`, `${node.field}.${node.operator}.${node.value}`)
      return String(ruleNumber)
    }
    const children = node.children.map(visit)
    if (!children.length) return ""
    if (children.length === 1) return children[0]!
    const connectors = node.connectors ?? Array(Math.max(0, children.length - 1)).fill(node.combinator)
    return `(${children.map((child, index) => `${index ? `-${connectors[index - 1]}-` : ""}${child}`).join("")})`
  }
  const logic = visit(query)
  if (logic) params.set("logic", logic.startsWith("(") ? logic.slice(1, -1) : logic)
}

export function readQueryParams(params: URLSearchParams): QueryGroup | null {
  const rules = new Map<number, QueryCondition>()
  for (const [key, raw] of params.entries()) {
    const match = /^rule(\d+)$/.exec(key)
    if (!match) continue
    const [fieldValue, operatorValue, ...valueParts] = raw.split(".")
    const field = queryFieldSchema.safeParse(fieldValue)
    const operator = queryOperatorSchema.safeParse(operatorValue)
    if (!field.success || !operator.success || !valueParts.length) return null
    const number = Number(match[1])
    rules.set(number, {
      kind: "condition", id: `url-rule-${number}`, field: field.data, operator: operator.data, value: valueParts.join("."),
    })
  }
  if (!rules.size) return null
  const logic = params.get("logic") ?? [...rules.keys()].sort((a, b) => a - b).join("-and-")
  const tokens = logic.match(/\d+|and|or|\(|\)/g) ?? []
  let index = 0
  let groupNumber = 0
  const group = (combinator: "and" | "or", children: QueryNode[]): QueryGroup => ({
    kind: "group", id: `url-group-${groupNumber++}`, combinator, children,
  })
  const primary = (): QueryNode | null => {
    const token = tokens[index++]
    if (token === "(") {
      const node = orExpression()
      if (tokens[index++] !== ")") return null
      return node
    }
    return token && /^\d+$/.test(token) ? rules.get(Number(token)) ?? null : null
  }
  const andExpression = (): QueryNode | null => {
    const children: QueryNode[] = []
    const first = primary()
    if (!first) return null
    children.push(first)
    while (tokens[index] === "and") {
      index += 1
      const child = primary()
      if (!child) return null
      children.push(child)
    }
    return children.length === 1 ? children[0]! : group("and", children)
  }
  const orExpression = (): QueryNode | null => {
    const children: QueryNode[] = []
    const first = andExpression()
    if (!first) return null
    children.push(first)
    while (tokens[index] === "or") {
      index += 1
      const child = andExpression()
      if (!child) return null
      children.push(child)
    }
    return children.length === 1 ? children[0]! : group("or", children)
  }
  const result = orExpression()
  if (!result || index !== tokens.length) return null
  return result.kind === "group" ? { ...result, id: "root" } : { kind: "group", id: "root", combinator: "and", children: [result] }
}

export function describeQuery(node: QueryNode): string {
  if (node.kind === "condition") return `${node.field} ${node.operator.replace("-", " ")} “${node.value}”`
  if (!node.children.length) return "No advanced conditions"
  const connectors = node.connectors ?? Array(Math.max(0, node.children.length - 1)).fill(node.combinator)
  return `(${node.children.map((child, index) => `${index ? `${connectors[index - 1]!.toUpperCase()} ` : ""}${describeQuery(child)}`).join(" ")})`
}
