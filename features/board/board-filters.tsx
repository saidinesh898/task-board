"use client"

import { Braces, ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PEOPLE, PRIORITIES } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"
import { countConditions } from "@/features/query-builder/query-engine"
import { QueryBuilder } from "@/features/query-builder/query-builder"

export function BoardFilters({ resultCount, totalCount }: { resultCount: number; totalCount: number }) {
  const search = useBoardStore((state) => state.search)
  const assignee = useBoardStore((state) => state.assignee)
  const priority = useBoardStore((state) => state.priority)
  const setFilter = useBoardStore((state) => state.setFilter)
  const clearFilters = useBoardStore((state) => state.clearFilters)
  const advancedQuery = useBoardStore((state) => state.advancedQuery)
  const builderOpen = useBoardStore((state) => state.queryBuilderOpen)
  const setBuilderOpen = useBoardStore((state) => state.setQueryBuilderOpen)
  const advancedCount = countConditions(advancedQuery)
  const filtered = search || assignee !== "all" || priority !== "all" || advancedCount > 0
  const toggleAdvanced = () => {
    if (!builderOpen) {
      setFilter("search", "")
      setFilter("assignee", "all")
      setFilter("priority", "all")
    }
    setBuilderOpen(!builderOpen)
  }
  return (
    <div className="space-y-3 rounded-2xl border bg-card p-3 shadow-sm">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input disabled={builderOpen} data-task-search="true" value={search} onChange={(event) => setFilter("search", event.target.value)} placeholder={builderOpen ? "Disabled while Advanced is active" : "Search title or description…  /"} className="pl-9" />
        </div>
        <div className="flex gap-2">
          <Select disabled={builderOpen} value={assignee} onValueChange={(value) => setFilter("assignee", value ?? "all")}>
            <SelectTrigger aria-label="Filter by person" className="min-w-32 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All assignees</SelectItem>{PEOPLE.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent>
          </Select>
          <Select disabled={builderOpen} value={priority} onValueChange={(value) => setFilter("priority", value ?? "all")}>
            <SelectTrigger aria-label="Filter by importance" className="min-w-28 flex-1"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All priorities</SelectItem>{PRIORITIES.map((item) => <SelectItem key={item} value={item} className="capitalize">{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button aria-pressed={builderOpen} variant={advancedCount ? "secondary" : "outline"} onClick={toggleAdvanced}><Braces />Advanced{advancedCount ? ` · ${advancedCount}` : ""}{builderOpen ? <ChevronUp /> : <ChevronDown />}</Button>
        <span className="shrink-0 text-xs text-muted-foreground">{resultCount.toLocaleString()} of {totalCount.toLocaleString()}</span>
        {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}><X />Clear</Button>}
      </div>
      {builderOpen && <QueryBuilder />}
    </div>
  )
}
