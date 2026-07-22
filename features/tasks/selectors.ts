import type { Priority, Task } from "./types"

export interface TaskFilters {
  search: string
  assignee: string
  priority: Priority | "all"
}

export function filterTasks(tasks: Task[], filters: TaskFilters) {
  const term = filters.search.trim().toLowerCase()
  return tasks.filter((task) =>
    (!term || task.title.toLowerCase().includes(term) || task.description.toLowerCase().includes(term)) &&
    (filters.assignee === "all" || task.assignee === filters.assignee) &&
    (filters.priority === "all" || task.priority === filters.priority)
  )
}

