# Real-Time Collaborative Task Board

## Overview

Build a task management board with real-time updates simulation, advanced filtering, and performance optimizations. The application should demonstrate your expertise in React patterns, performance optimization, and handling complex state.

This assignment consists of multiple parts with increasing difficulty. Attempt as much as possible, but completing everything is not expected. We value depth and quality over breadth.

You are encouraged to use your judgment to modify or adapt requirements as you would in a real project with ambiguous specifications. Document any significant changes or assumptions in your README.

**AI-Assisted Coding:** The use of AI-assisted coding tools (GitHub Copilot, ChatGPT, Claude, etc.) is allowed and encouraged. However, you must fully understand how the code works, even if AI generated it. You may be asked to explain your implementation decisions and code logic.

## Part 1: Core Functionality

### Requirements

#### 1. Task List Display

- Display tasks with:
  - Title
  - Description
  - Status: Todo, In Progress, Done
  - Priority: Low, Medium, High
  - Assignee
  - Created date
- Support for 3 columns:
  - Todo
  - In Progress
  - Done
- Each task should be draggable between columns. Use any drag-and-drop library or native drag-and-drop.

#### 2. Task Creation

- Provide a modal or form to create new tasks.
- Required fields:
  - Title
  - Description
  - Assignee
- Optional fields:
  - Priority
  - Tags

#### 3. Basic Filtering

- Filter by assignee.
- Filter by priority.
- Search by title or description.

### Success Criteria

- Clean component structure.
- Proper state management using Context API or local state.
- TypeScript types/interfaces are a bonus.

## Part 2: Advanced Features

### Requirements

#### 1. Optimistic Updates with Rollback

- Simulate API calls with a 2-second delay using `setTimeout`.
- Implement optimistic updates when changing task status.
- If the simulated API call fails with a 10% random failure rate, rollback the change and show an error.
- Show loading states during updates.

#### 2. Real-Time Simulation

- Simulate another user making changes every 10-15 seconds with random task updates.
- Show a toast or notification when external changes occur.
- Handle merge conflicts if the user is editing the same task.
- Implement a proper reconciliation strategy.

#### 3. Performance Optimization

- The task list should support 1000+ tasks efficiently.
- Implement virtualization for the task list.
- Optimize re-renders. Demonstrate this with React DevTools Profiler or explain in comments.
- Memoize expensive computations.

### Success Criteria

- Smooth UX even with large datasets.
- No unnecessary re-renders.
- Proper error boundaries.
- Race condition handling.

## Part 3: Expert Challenge

Choose **one** of the following challenges.

### Option A: Advanced State Management

Implement an undo/redo system that:

- Tracks all task changes, including status, title, assignee, and other fields.
- Supports keyboard shortcuts:
  - `Ctrl/Cmd+Z`
  - `Ctrl/Cmd+Shift+Z`
- Maintains a history stack with a maximum of 50 actions.
- Works correctly with optimistic updates and rollbacks.
- Shows what action will be undone or redone in the UI.

### Option B: Complex Filtering & Search

Implement an advanced query builder that:

- Supports compound filters using AND/OR logic.
- Supports queries such as:

```text
(priority = high AND assignee = John) OR (status = done AND tags contains "urgent")
```

- Has a visual query builder UI, similar to MongoDB Compass or similar tools.
- Updates URL params with the query for shareable links.
- Supports saving favorite queries to `localStorage`.
- Handles filter performance for 1000+ tasks.

### Option C: Collaboration Conflict Resolution

Implement a sophisticated conflict resolution system:

- Show real-time presence indicators for who is viewing or editing each task.
- Lock editing when another user is editing the same task.
- Show a "merge changes" modal when conflicts occur.
- Allow users to choose:
  - Keep mine
  - Take theirs
  - Merge manually
- Implement operational transformation or CRDT-like logic for the description field.
- Handle network reconnection scenarios.

## Technical Requirements

### Must Have

- React 18+ with hooks.
- Functional components only.
- Clean, readable code with comments for complex logic.
- Proper error handling.
- Responsive design that is mobile-friendly.

### Nice to Have

- TypeScript.
- Unit tests for critical logic, at least 2-3 tests.
- CSS-in-JS or Tailwind.
- Custom hooks for reusable logic.
- Accessibility considerations.

## Starter Data: Mock Tasks

```javascript
const mockTasks = [
  {
    id: '1',
    title: 'Implement authentication',
    description: 'Add JWT-based auth',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    tags: ['backend', 'security'],
    createdAt: '2024-11-20T10:00:00Z'
  },
  {
    id: '2',
    title: 'Design new landing page',
    description: 'Create mockups for homepage redesign',
    status: 'in-progress',
    priority: 'medium',
    assignee: 'Jane Smith',
    tags: ['design', 'frontend'],
    createdAt: '2024-11-19T14:30:00Z'
  },
  {
    id: '3',
    title: 'Fix payment gateway bug',
    description: 'Users unable to complete checkout',
    status: 'todo',
    priority: 'high',
    assignee: 'John Doe',
    tags: ['backend', 'urgent'],
    createdAt: '2024-11-21T09:15:00Z'
  },
  // Add 20-30 more for testing...
];
```

## Bonus Points

- Implement keyboard shortcuts for power users.
- Add animations/transitions, but keep them performant.
- Add dark mode support.
- Offline-first approach with service workers.
- Write a technical blog post explaining one complex decision.

Feel free to make reasonable assumptions and document them in your README.

Good luck!
