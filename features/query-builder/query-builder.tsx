"use client"

import { useState } from "react"
import { Bookmark, Braces, Plus, Save, Trash2, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PEOPLE, PRIORITIES, STATUSES, STATUS_LABELS } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"
import { appendQueryNode, countConditions, describeQuery, removeQueryNode, updateQueryNode } from "./query-engine"
import { createCondition, createGroup, type QueryCondition, type QueryField, type QueryGroup, type QueryNode, type QueryOperator } from "./types"
import styles from "./query-builder.module.css"

const fieldLabels: Record<QueryField, string> = {
  title: "Title", description: "Description", status: "Status", priority: "Priority", assignee: "Assignee", tags: "Tags",
}
const operatorLabels: Record<QueryOperator, string> = {
  equals: "equals", "not-equals": "does not equal", contains: "contains", "not-contains": "does not contain",
}

function defaultValue(field: QueryField) {
  if (field === "priority") return "high"
  if (field === "status") return "todo"
  if (field === "assignee") return PEOPLE[0]
  return ""
}

export function QueryBuilder() {
  const query = useBoardStore((state) => state.advancedQuery)
  const setQuery = useBoardStore((state) => state.setAdvancedQuery)
  const favorites = useBoardStore((state) => state.favoriteQueries)
  const saveFavorite = useBoardStore((state) => state.saveFavoriteQuery)
  const applyFavorite = useBoardStore((state) => state.applyFavoriteQuery)
  const deleteFavorite = useBoardStore((state) => state.deleteFavoriteQuery)
  const [favoriteName, setFavoriteName] = useState("")
  const update = (id: string, change: (node: QueryNode) => QueryNode) => setQuery(updateQueryNode(query, id, change))

  return <div className={styles.style1}>
    <div className={styles.style2}>
      <div><div className={styles.style3}><Braces className={styles.style4} />Advanced query <Badge variant="secondary">{countConditions(query)}</Badge></div><p className={styles.style5}>{describeQuery(query)}</p></div>
      <Button variant="ghost" size="sm" disabled={!countConditions(query)} onClick={() => setQuery({ ...query, children: [] })}><X />Clear query</Button>
    </div>

    <QueryGroupEditor
      group={query}
      root
      onUpdate={update}
      onAppend={(groupId, node) => setQuery(appendQueryNode(query, groupId, node))}
      onRemove={(id) => setQuery(removeQueryNode(query, id))}
    />

    <div className={styles.style6}>
      <div className={styles.style7}><Input aria-label="Favorite query name" value={favoriteName} maxLength={60} onChange={(event) => setFavoriteName(event.target.value)} placeholder="Favorite name" /><Button disabled={!favoriteName.trim() || !countConditions(query)} onClick={() => { saveFavorite(favoriteName); setFavoriteName("") }}><Save />Save</Button></div>
      <div className={styles.style8}>
        <span className={styles.style9}><Bookmark className={styles.style10} />Favorites</span>
        {!favorites.length && <span className={styles.style11}>No saved queries</span>}
        {favorites.map((favorite) => <div key={favorite.id} className={styles.style12}><button className={styles.style13} onClick={() => applyFavorite(favorite.id)}>{favorite.name}</button><button aria-label={`Delete favorite ${favorite.name}`} className={styles.style14} onClick={() => deleteFavorite(favorite.id)}><Trash2 className={styles.style15} /></button></div>)}
      </div>
    </div>
  </div>
}

function QueryGroupEditor({ group, root, onUpdate, onAppend, onRemove }: {
  group: QueryGroup
  root?: boolean
  onUpdate: (id: string, update: (node: QueryNode) => QueryNode) => void
  onAppend: (id: string, node: QueryNode) => void
  onRemove: (id: string) => void
}) {
  return <fieldset className={styles.style16}>
    <legend className={styles.style17}>{root ? "Match" : "Nested group"}</legend>
    <div className={styles.style8}>
      <Select value={group.combinator} onValueChange={(value) => value && onUpdate(group.id, (node) => ({ ...(node as QueryGroup), combinator: value, connectors: Array(Math.max(0, (node as QueryGroup).children.length - 1)).fill(value) }))}>
        <SelectTrigger aria-label={`${root ? "Root" : "Nested"} default logic`} className={styles.style18}><SelectValue /></SelectTrigger>
        <SelectContent><SelectItem value="and">All (AND)</SelectItem><SelectItem value="or">Any (OR)</SelectItem></SelectContent>
      </Select>
      <span className={styles.style11}>Set all connectors</span>
      <div className={styles.style19}><Button variant="outline" size="sm" onClick={() => onAppend(group.id, createCondition())}><Plus />Rule</Button><Button variant="outline" size="sm" onClick={() => onAppend(group.id, createGroup())}><Plus />Group</Button>{!root && <Button aria-label="Remove group" variant="ghost" size="icon-sm" onClick={() => onRemove(group.id)}><Trash2 /></Button>}</div>
    </div>
    {!group.children.length && <button className={styles.style20} onClick={() => onAppend(group.id, createCondition())}>Add the first condition</button>}
    {group.children.map((child, index) => <div key={child.id} className={styles.style21}>
      {index > 0 && <div className={styles.style22}>
        <Select value={group.connectors?.[index - 1] ?? group.combinator} onValueChange={(value) => value && onUpdate(group.id, (node) => {
          const current = node as QueryGroup
          const connectors = current.connectors ?? Array(Math.max(0, current.children.length - 1)).fill(current.combinator)
          return { ...current, connectors: connectors.map((connector, connectorIndex) => connectorIndex === index - 1 ? value : connector) }
        })}>
          <SelectTrigger aria-label={`Connector before rule ${index + 1}`} className={styles.style23}><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="and">AND</SelectItem><SelectItem value="or">OR</SelectItem></SelectContent>
        </Select>
      </div>}
      {child.kind === "group"
        ? <QueryGroupEditor group={child} onUpdate={onUpdate} onAppend={onAppend} onRemove={onRemove} />
        : <ConditionEditor condition={child} onUpdate={onUpdate} onRemove={onRemove} />}
    </div>)}
  </fieldset>
}

function ConditionEditor({ condition, onUpdate, onRemove }: { condition: QueryCondition; onUpdate: (id: string, update: (node: QueryNode) => QueryNode) => void; onRemove: (id: string) => void }) {
  const patch = (value: Partial<QueryCondition>) => onUpdate(condition.id, (node) => ({ ...(node as QueryCondition), ...value }))
  return <div className={styles.style24}>
    <Select value={condition.field} onValueChange={(field) => field && patch({ field, value: defaultValue(field) })}><SelectTrigger aria-label="Query field" className={styles.style25}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(fieldLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
    <Select value={condition.operator} onValueChange={(operator) => operator && patch({ operator })}><SelectTrigger aria-label="Query operator" className={styles.style25}><SelectValue /></SelectTrigger><SelectContent>{Object.entries(operatorLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
    <ConditionValue condition={condition} onChange={(value) => patch({ value })} />
    <Button aria-label="Remove condition" variant="ghost" size="icon" onClick={() => onRemove(condition.id)}><Trash2 /></Button>
  </div>
}

function ConditionValue({ condition, onChange }: { condition: QueryCondition; onChange: (value: string) => void }) {
  if (condition.field === "priority") return <ValueSelect label="Priority value" value={condition.value} onChange={onChange} options={PRIORITIES.map((value) => [value, value])} />
  if (condition.field === "status") return <ValueSelect label="Status value" value={condition.value} onChange={onChange} options={STATUSES.map((value) => [value, STATUS_LABELS[value]])} />
  if (condition.field === "assignee") return <ValueSelect label="Assignee value" value={condition.value} onChange={onChange} options={PEOPLE.map((value) => [value, value])} />
  return <Input aria-label={`${fieldLabels[condition.field]} query value`} value={condition.value} onChange={(event) => onChange(event.target.value)} placeholder={condition.field === "tags" ? "urgent" : "Enter text"} />
}

function ValueSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) {
  return <Select items={Object.fromEntries(options)} value={value} onValueChange={(next) => next && onChange(next)}><SelectTrigger aria-label={label} className={styles.style25}><SelectValue /></SelectTrigger><SelectContent>{options.map(([option, text]) => <SelectItem key={option} value={option} className={styles.style26}>{text}</SelectItem>)}</SelectContent></Select>
}
