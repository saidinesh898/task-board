import { z } from "zod"

export const queryFieldSchema = z.enum(["title", "description", "status", "priority", "assignee", "tags"])
export const queryOperatorSchema = z.enum(["equals", "not-equals", "contains", "not-contains"])

export type QueryField = z.infer<typeof queryFieldSchema>
export type QueryOperator = z.infer<typeof queryOperatorSchema>

export interface QueryCondition {
  kind: "condition"
  id: string
  field: QueryField
  operator: QueryOperator
  value: string
}

export interface QueryGroup {
  kind: "group"
  id: string
  combinator: "and" | "or"
  children: QueryNode[]
  connectors?: Array<"and" | "or">
}

export type QueryNode = QueryCondition | QueryGroup

const queryConditionSchema: z.ZodType<QueryCondition> = z.object({
  kind: z.literal("condition"),
  id: z.string().min(1),
  field: queryFieldSchema,
  operator: queryOperatorSchema,
  value: z.string(),
})

export const queryGroupSchema: z.ZodType<QueryGroup> = z.lazy(() => z.object({
  kind: z.literal("group"),
  id: z.string().min(1),
  combinator: z.enum(["and", "or"]),
  children: z.array(z.union([queryConditionSchema, queryGroupSchema])).max(50),
  connectors: z.array(z.enum(["and", "or"])).max(49).optional(),
}))

export const queryPayloadSchema = z.object({ version: z.literal(1), query: queryGroupSchema })

export interface FavoriteQuery {
  id: string
  name: string
  query: QueryGroup
  createdAt: string
}

export function createEmptyQuery(): QueryGroup {
  return { kind: "group", id: "root", combinator: "and", children: [] }
}

export function createCondition(): QueryCondition {
  return { kind: "condition", id: crypto.randomUUID(), field: "priority", operator: "equals", value: "high" }
}

export function createGroup(): QueryGroup {
  return { kind: "group", id: crypto.randomUUID(), combinator: "and", children: [createCondition()] }
}
