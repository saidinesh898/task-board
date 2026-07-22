import type { Priority, Task, TaskStatus } from "./types"

const titles = [
  "Implement authentication",
  "Design new landing page",
  "Fix payment gateway bug",
  "Add audit logging",
  "Improve search relevance",
  "Prepare release notes",
  "Refine empty states",
  "Optimize image delivery",
  "Review accessibility",
  "Migrate analytics events",
]

const descriptions = [
  "Add JWT-based authentication and refresh token handling.",
  "Create responsive mockups and a polished hero experience.",
  "Investigate checkout failures and improve retry feedback.",
  "Capture important changes with actor and timestamp metadata.",
  "Tune ranking and highlight matching terms in results.",
]

const people = ["You", "Alex Morgan", "Priya Shah", "Jordan Lee"]
const tags = ["frontend", "backend", "design", "urgent", "quality", "product"]

export function makeSeedTasks(count = 30): Task[] {
  return Array.from({ length: count }, (_, index) => {
    const status = ["todo", "in-progress", "done"][index % 3] as TaskStatus
    const priority = ["high", "medium", "low"][index % 3] as Priority
    const createdAt = new Date(Date.UTC(2026, 6, 1 + (index % 20), 8 + (index % 8))).toISOString()
    return {
      id: `task-${index + 1}`,
      title: count > 100 ? `${titles[index % titles.length]} #${index + 1}` : titles[index % titles.length],
      description: descriptions[index % descriptions.length],
      status,
      priority,
      assignee: people[index % people.length],
      tags: [tags[index % tags.length], tags[(index + 2) % tags.length]],
      createdAt,
      updatedAt: createdAt,
      updatedBy: people[index % people.length],
      version: 1,
      position: Math.floor(index / 3) * 1000,
    }
  })
}

