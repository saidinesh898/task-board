"use client"

import Link from "next/link"
import { useTheme } from "next-themes"
import {
  BookOpenCheck,
  Keyboard,
  Laptop,
  Mail,
  Moon,
  Plus,
  Redo2,
  Sun,
  Undo2,
  Zap,
} from "lucide-react"
import { FaGithub, FaLinkedin } from "react-icons/fa"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { STATUSES } from "@/features/tasks/types"
import styles from "./board-app.module.css"

interface BoardHeaderProps {
  undo: () => void
  redo: () => void
  undoLabel?: string
  redoLabel?: string
  onCreate: () => void
  onShortcuts: () => void
}

export function BoardHeader({
  undo,
  redo,
  undoLabel,
  redoLabel,
  onCreate,
  onShortcuts,
}: BoardHeaderProps) {
  const { setTheme } = useTheme()

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <Zap className={styles.icon} fill="currentColor" />
          </div>
          <span className={styles.brandName}>
            Thomson Reuters Board
          </span>
        </div>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={!undoLabel}
                onClick={undo}
                aria-label={
                  undoLabel
                    ? `Undo ${undoLabel}`
                    : "Nothing to undo"
                }
              />
            }
          >
            <Undo2 />
          </TooltipTrigger>
          <TooltipContent>
            {undoLabel ? `Undo: ${undoLabel}` : "Nothing to undo"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                disabled={!redoLabel}
                onClick={redo}
                aria-label={
                  redoLabel
                    ? `Redo ${redoLabel}`
                    : "Nothing to redo"
                }
              />
            }
          >
            <Redo2 />
          </TooltipTrigger>
          <TooltipContent>
            {redoLabel ? `Redo: ${redoLabel}` : "Nothing to redo"}
          </TooltipContent>
        </Tooltip>

        <Button
          variant="outline"
          onClick={onShortcuts}
          aria-label="Keyboard Shortcuts"
        >
          <Keyboard />
          <span className={styles.responsiveLabel}>
            Keyboard Shortcuts
          </span>
          <span className={styles.shortcutKey}>?</span>
        </Button>

        <Button
          variant="outline"
          nativeButton={false}
          render={<Link href="/interview-guide" />}
          aria-label="Open interview guide"
        >
          <BookOpenCheck />
          <span className={styles.desktopLabel}>
            Interview guide
          </span>
        </Button>

        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger
              render={
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Choose theme"
                    />
                  }
                />
              }
            >
              <Moon />
            </TooltipTrigger>
            <TooltipContent>Choose theme</TooltipContent>
          </Tooltip>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setTheme("light")}>
              <Sun />
              Light
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("dark")}>
              <Moon />
              Dark
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setTheme("system")}>
              <Laptop />
              System
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={onCreate}>
          <Plus />
          <span className={styles.responsiveLabel}>New task</span>
          <span className={styles.primaryShortcutKey}>N</span>
        </Button>
      </div>
    </header>
  )
}

export function BoardFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <p className={styles.ownerName}>Sai Dinesh</p>
        <nav
          aria-label="Owner contact links"
          className={styles.footerLinks}
        >
          <a
            className={styles.footerLink}
            href="mailto:sai_dinesh@epam.com"
          >
            <Mail className={styles.icon} />
            sai_dinesh@epam.com
          </a>
          <a
            className={styles.footerLink}
            href="https://github.com/saidinesh898/task-board"
            target="_blank"
            rel="noreferrer"
          >
            <FaGithub
              className={styles.icon}
              aria-hidden="true"
            />
            GitHub
          </a>
          <a
            className={styles.linkedInLink}
            href="https://www.linkedin.com/in/saidineshkumar/"
            target="_blank"
            rel="noreferrer"
          >
            <FaLinkedin
              className={styles.icon}
              aria-hidden="true"
            />
            LinkedIn
          </a>
        </nav>
      </div>
    </footer>
  )
}

export function LoadingBoard() {
  return (
    <div className={styles.loadingBoard}>
      {STATUSES.map((status) => (
        <div key={status} className={styles.loadingColumn}>
          <Skeleton className={styles.loadingHeader} />
          {Array.from({ length: 3 }, (_, index) => (
            <Skeleton
              key={index}
              className={styles.loadingCard}
            />
          ))}
        </div>
      ))}
    </div>
  )
}
