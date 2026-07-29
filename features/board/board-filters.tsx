"use client"

import { Braces, ChevronDown, ChevronUp, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { PEOPLE, PRIORITIES } from "@/features/tasks/types"
import { useBoardStore } from "@/stores/board-store"
import { countConditions } from "@/features/query-builder/query-engine"
import { QueryBuilder } from "@/features/query-builder/query-builder"
import styles from "./board-filters.module.css"

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
    <div className={styles.panel}>
      <div className={styles.controls}>
        <div className={styles.searchField}>
          <Search className={styles.searchIcon} />
          <Input disabled={builderOpen} data-task-search="true" value={search} onChange={(event) => setFilter("search", event.target.value)} placeholder={builderOpen ? "Disabled while Advanced is active" : "Search title or description…  /"} className={styles.searchInput} />
        </div>
        <div className={styles.selectGroup}>
          <Select disabled={builderOpen} value={assignee} onValueChange={(value) => setFilter("assignee", value ?? "all")}>
            <SelectTrigger aria-label="Filter by person" className={styles.assigneeSelect}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All assignees</SelectItem>{PEOPLE.map((person) => <SelectItem key={person} value={person}>{person}</SelectItem>)}</SelectContent>
          </Select>
          <Select disabled={builderOpen} value={priority} onValueChange={(value) => setFilter("priority", value ?? "all")}>
            <SelectTrigger aria-label="Filter by importance" className={styles.prioritySelect}><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="all">All priorities</SelectItem>{PRIORITIES.map((item) => <SelectItem key={item} value={item} className={styles.capitalize}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button aria-pressed={builderOpen} variant={advancedCount ? "secondary" : "outline"} onClick={toggleAdvanced}><Braces />Advanced{advancedCount ? ` · ${advancedCount}` : ""}{builderOpen ? <ChevronUp /> : <ChevronDown />}</Button>
        <span className={styles.resultCount}>{resultCount.toLocaleString()} of {totalCount.toLocaleString()}</span>
        {filtered && <Button variant="ghost" size="sm" onClick={clearFilters}><X />Clear</Button>}
      </div>
      {builderOpen && <QueryBuilder />}
    </div>
  )
}
