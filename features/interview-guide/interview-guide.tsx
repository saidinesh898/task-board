"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useTheme } from "next-themes"
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  Check,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clipboard,
  Copy,
  FileCode2,
  GitBranch,
  Layers3,
  Menu,
  Moon,
  Network,
  Play,
  RotateCcw,
  Search,
  Sparkles,
  Sun,
  Target,
  TimerReset,
  X,
  Zap,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import {
  accentClasses,
  allQuestions,
  flows,
  lessons,
  type InterviewQuestion,
  type Lesson,
} from "./content"

type View = "learn" | "flows" | "drill"
type Confidence = 0 | 1 | 2

type StoredProgress = {
  completed: string[]
  confidence: Record<string, Confidence>
}

const PROGRESS_KEY = "task-board:interview-progress:v1"

export function InterviewGuide() {
  const [view, setView] = useState<View>("learn")
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [completed, setCompleted] = useState<Set<string>>(new Set())
  const [confidence, setConfidence] = useState<Record<string, Confidence>>({})
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    let active = true
    queueMicrotask(() => {
      if (!active) return
      try {
        const raw = window.localStorage.getItem(PROGRESS_KEY)
        if (raw) {
          const stored = JSON.parse(raw) as StoredProgress
          setCompleted(new Set(stored.completed ?? []))
          setConfidence(stored.confidence ?? {})
        }
      } catch {
        // A broken study preference should never block the guide.
      } finally {
        setHydrated(true)
      }
    })
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    const state: StoredProgress = {
      completed: [...completed],
      confidence,
    }
    window.localStorage.setItem(PROGRESS_KEY, JSON.stringify(state))
  }, [completed, confidence, hydrated])

  const filteredLessons = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return lessons
    return lessons.filter((lesson) =>
      [
        lesson.title,
        lesson.eyebrow,
        lesson.summary,
        ...lesson.outcomes,
        ...lesson.concepts.flatMap((concept) => [concept.title, concept.body]),
        ...lesson.questions.flatMap((question) => [question.question, question.answer]),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [search])

  const selectedLesson =
    lessons.find((lesson) => lesson.id === selectedLessonId) ?? null
  const completionPercent = Math.round((completed.size / lessons.length) * 100)
  const masteredCount = Object.values(confidence).filter((value) => value === 2).length

  const chooseLesson = (id: string | null) => {
    setSelectedLessonId(id)
    setView("learn")
    setMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: "smooth" })
  }

  const toggleCompleted = (id: string) => {
    setCompleted((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const resetProgress = () => {
    if (!window.confirm("Reset all lesson and drill progress?")) return
    setCompleted(new Set())
    setConfidence({})
  }

  return (
    <div className="min-h-screen bg-[#f7f8fb] text-slate-950 dark:bg-[#080a0f] dark:text-slate-100">
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 opacity-70 [background-image:radial-gradient(circle_at_12%_8%,rgba(124,58,237,.12),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,.10),transparent_24%),linear-gradient(rgba(15,23,42,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(15,23,42,.025)_1px,transparent_1px)] [background-size:auto,auto,32px_32px,32px_32px] dark:opacity-90 dark:[background-image:radial-gradient(circle_at_12%_8%,rgba(124,58,237,.16),transparent_28%),radial-gradient(circle_at_86%_18%,rgba(6,182,212,.10),transparent_26%),linear-gradient(rgba(255,255,255,.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.025)_1px,transparent_1px)]"
      />

      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl dark:border-white/10 dark:bg-[#080a0f]/85">
        <div className="mx-auto flex h-16 max-w-[1720px] items-center gap-3 px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Open study navigation"
          >
            <Menu />
          </Button>
          <Link
            href="/interview-guide"
            onClick={() => {
              setView("learn")
              setSelectedLessonId(null)
            }}
            className="flex min-w-0 items-center gap-2.5"
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-slate-950 text-white shadow-lg shadow-violet-500/20 dark:bg-white dark:text-slate-950">
              <BrainCircuit className="size-4.5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold tracking-tight">
                Board Systems Lab
              </span>
              <span className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
                Interview prep, grounded in your code
              </span>
            </span>
          </Link>

          <nav
            aria-label="Study modes"
            className="ml-auto hidden items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1 md:flex dark:border-white/10 dark:bg-white/5"
          >
            <ModeButton
              active={view === "learn"}
              icon={BookOpen}
              label="Learn"
              onClick={() => setView("learn")}
            />
            <ModeButton
              active={view === "flows"}
              icon={GitBranch}
              label="Flow lab"
              onClick={() => setView("flows")}
            />
            <ModeButton
              active={view === "drill"}
              icon={Target}
              label="Drill"
              onClick={() => setView("drill")}
            />
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <div className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold sm:flex dark:border-white/10 dark:bg-white/5">
              <span
                className="grid size-5 place-items-center rounded-full text-[9px] font-bold text-violet-700 dark:text-violet-300"
                style={{
                  background: `conic-gradient(rgb(124 58 237) ${completionPercent}%, rgb(226 232 240) 0)`,
                }}
              >
                <span className="grid size-3.5 place-items-center rounded-full bg-white dark:bg-slate-950">
                  {completionPercent}
                </span>
              </span>
              {completed.size}/{lessons.length}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              aria-label="Toggle color theme"
            >
              {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            </Button>
            <Button
              variant="outline"
              nativeButton={false}
              render={<Link href="/" />}
              className="hidden sm:inline-flex"
            >
              <ArrowLeft />
              Board
            </Button>
          </div>
        </div>

        <div className="flex border-t border-slate-200/70 px-4 py-2 md:hidden dark:border-white/10">
          <ModeButton
            active={view === "learn"}
            icon={BookOpen}
            label="Learn"
            onClick={() => setView("learn")}
            mobile
          />
          <ModeButton
            active={view === "flows"}
            icon={GitBranch}
            label="Flow lab"
            onClick={() => setView("flows")}
            mobile
          />
          <ModeButton
            active={view === "drill"}
            icon={Target}
            label="Drill"
            onClick={() => setView("drill")}
            mobile
          />
        </div>
      </header>

      <div className="relative mx-auto grid max-w-[1720px] lg:grid-cols-[290px_minmax(0,1fr)]">
        <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] border-r border-slate-200/80 bg-white/55 lg:block dark:border-white/10 dark:bg-white/[.015]">
          <StudyNavigation
            search={search}
            setSearch={setSearch}
            filteredLessons={filteredLessons}
            selectedLessonId={selectedLessonId}
            completed={completed}
            chooseLesson={chooseLesson}
            resetProgress={resetProgress}
          />
        </aside>

        <main className="min-w-0 px-4 py-7 sm:px-7 lg:px-10 lg:py-10 xl:px-14">
          {view === "learn" &&
            (selectedLesson ? (
              <LessonView
                lesson={selectedLesson}
                completed={completed.has(selectedLesson.id)}
                onToggleComplete={() => toggleCompleted(selectedLesson.id)}
                onNext={() => {
                  const index = lessons.findIndex((item) => item.id === selectedLesson.id)
                  const next = lessons[index + 1]
                  chooseLesson(next?.id ?? null)
                }}
              />
            ) : (
              <Overview
                completed={completed}
                completionPercent={completionPercent}
                masteredCount={masteredCount}
                onStart={() => chooseLesson(lessons[0]!.id)}
                onChoose={chooseLesson}
                onChangeView={setView}
              />
            ))}
          {view === "flows" && <FlowLab />}
          {view === "drill" && (
            <DrillMode
              confidence={confidence}
              setConfidence={setConfidence}
              masteredCount={masteredCount}
            />
          )}
        </main>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          />
          <aside className="absolute inset-y-0 left-0 w-[min(88vw,340px)] border-r border-slate-200 bg-white shadow-2xl dark:border-white/10 dark:bg-[#0d1018]">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-white/10">
              <span className="font-bold">Study map</span>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <StudyNavigation
              search={search}
              setSearch={setSearch}
              filteredLessons={filteredLessons}
              selectedLessonId={selectedLessonId}
              completed={completed}
              chooseLesson={chooseLesson}
              resetProgress={resetProgress}
            />
          </aside>
        </div>
      )}
    </div>
  )
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick,
  mobile = false,
}: {
  active: boolean
  icon: typeof BookOpen
  label: string
  onClick: () => void
  mobile?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-white text-slate-950 shadow-sm ring-1 ring-slate-950/5 dark:bg-white/10 dark:text-white dark:ring-white/10"
          : "text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white",
        mobile && "flex-1"
      )}
    >
      <Icon className="size-3.5" />
      {label}
    </button>
  )
}

function StudyNavigation({
  search,
  setSearch,
  filteredLessons,
  selectedLessonId,
  completed,
  chooseLesson,
  resetProgress,
}: {
  search: string
  setSearch: (value: string) => void
  filteredLessons: Lesson[]
  selectedLessonId: string | null
  completed: Set<string>
  chooseLesson: (id: string | null) => void
  resetProgress: () => void
}) {
  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 p-4 dark:border-white/10">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search concepts..."
            className="h-9 rounded-xl border-slate-200 bg-white pl-9 dark:border-white/10 dark:bg-white/5"
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <button
          onClick={() => chooseLesson(null)}
          className={cn(
            "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition",
            selectedLessonId === null
              ? "bg-slate-950 text-white shadow-lg shadow-slate-950/10 dark:bg-white dark:text-slate-950"
              : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
          )}
        >
          <Sparkles className="size-4" />
          Overview
        </button>
        <p className="px-3 pb-2 pt-4 text-[10px] font-bold uppercase tracking-[.2em] text-slate-400">
          Learning path
        </p>
        <div className="space-y-1">
          {filteredLessons.map((lesson) => {
            const accent = accentClasses[lesson.accent]
            const active = selectedLessonId === lesson.id
            const done = completed.has(lesson.id)
            return (
              <button
                key={lesson.id}
                onClick={() => chooseLesson(lesson.id)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                  active
                    ? cn(accent.soft, accent.text)
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/5"
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-lg border text-[10px] font-bold",
                    active
                      ? cn(accent.border, accent.soft)
                      : "border-slate-200 bg-white text-slate-400 dark:border-white/10 dark:bg-white/5",
                    done && "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                  )}
                >
                  {done ? <Check className="size-3.5" /> : lesson.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs font-semibold">
                    {lesson.shortTitle}
                  </span>
                  <span className="mt-0.5 block text-[10px] text-slate-400">
                    {lesson.minutes} min
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {!filteredLessons.length && (
          <div className="px-3 py-8 text-center text-xs text-slate-400">
            No concepts match “{search}”.
          </div>
        )}
      </div>
      <div className="border-t border-slate-200/80 p-3 dark:border-white/10">
        <button
          onClick={resetProgress}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-white/5 dark:hover:text-slate-200"
        >
          <RotateCcw className="size-3.5" />
          Reset study progress
        </button>
      </div>
    </div>
  )
}

function Overview({
  completed,
  completionPercent,
  masteredCount,
  onStart,
  onChoose,
  onChangeView,
}: {
  completed: Set<string>
  completionPercent: number
  masteredCount: number
  onStart: () => void
  onChoose: (id: string) => void
  onChangeView: (view: View) => void
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <section className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white px-6 py-10 shadow-[0_30px_100px_-60px_rgba(15,23,42,.35)] sm:px-10 sm:py-14 dark:border-white/10 dark:bg-white/[.035]">
        <div
          aria-hidden="true"
          className="absolute -right-24 -top-32 size-80 rounded-full bg-violet-500/15 blur-3xl"
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-36 left-1/3 size-72 rounded-full bg-cyan-500/10 blur-3xl"
        />
        <div className="relative grid gap-10 xl:grid-cols-[minmax(0,1fr)_420px] xl:items-center">
          <div>
            <Badge className="mb-5 border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300">
              <Sparkles />
              Built from the real repository
            </Badge>
            <h1 className="max-w-4xl text-balance text-4xl font-black tracking-[-.045em] sm:text-6xl lg:text-7xl">
              Understand the board.
              <span className="block bg-gradient-to-r from-violet-600 via-indigo-500 to-cyan-500 bg-clip-text text-transparent">
                Defend every decision.
              </span>
            </h1>
            <p className="mt-6 max-w-2xl text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
              Ten focused modules, five animated system traces, exact code patterns,
              and a 35-question confidence drill—designed for a mid-level interview
              with senior follow-ups.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                size="lg"
                onClick={onStart}
                className="h-11 rounded-xl bg-slate-950 px-5 text-white shadow-xl shadow-violet-500/20 hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              >
                <Play fill="currentColor" />
                Start the learning path
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onChangeView("flows")}
                className="h-11 rounded-xl px-5"
              >
                <GitBranch />
                Explore a system flow
              </Button>
            </div>
          </div>
          <ArchitectureMap />
        </div>
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Learning progress"
          value={`${completionPercent}%`}
          detail={`${completed.size} of ${lessons.length} modules complete`}
          icon={BookOpen}
          accent="violet"
        />
        <Metric
          label="Question mastery"
          value={`${masteredCount}/${allQuestions.length}`}
          detail="Confidence-rated interview answers"
          icon={Target}
          accent="cyan"
        />
        <Metric
          label="System flows"
          value={`${flows.length}`}
          detail="Create, rollback, offline, query, conflict"
          icon={GitBranch}
          accent="amber"
        />
        <Metric
          label="Study time"
          value={`${lessons.reduce((sum, item) => sum + item.minutes, 0)}m`}
          detail="Complete guided path"
          icon={TimerReset}
          accent="emerald"
        />
      </section>

      <section className="mt-12">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.18em] text-violet-600 dark:text-violet-400">
              Guided curriculum
            </p>
            <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-3xl">
              From route shell to production redesign
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => onChangeView("drill")}
            className="hidden sm:inline-flex"
          >
            Jump to drill
            <ArrowRight />
          </Button>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {lessons.map((lesson) => (
            <LessonCard
              key={lesson.id}
              lesson={lesson}
              complete={completed.has(lesson.id)}
              onClick={() => onChoose(lesson.id)}
            />
          ))}
        </div>
      </section>

      <section className="mt-12 grid gap-5 lg:grid-cols-2">
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 text-white shadow-2xl shadow-slate-950/10 dark:border-white/10">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-300">
            <Layers3 className="size-4" />
            The core equation
          </div>
          <div className="mt-6 space-y-3 font-mono text-sm">
            <StateRow number="01" label="confirmed" note="durable truth" color="emerald" />
            <div className="pl-5 text-slate-500">+</div>
            <StateRow number="02" label="pending[]" note="durable intent" color="amber" />
            <div className="pl-5 text-slate-500">= reduce(applyOperation)</div>
            <StateRow number="03" label="projected" note="visible board" color="violet" />
          </div>
          <p className="mt-6 text-sm leading-6 text-slate-400">
            If one operation fails, remove only that intent and rebuild from the
            latest truth. Never restore an old whole-array snapshot.
          </p>
        </div>
        <VirtualizerMini />
      </section>
    </div>
  )
}

function ArchitectureMap() {
  const nodes = [
    ["Next.js shell", "Server"],
    ["Feature UI", "Client"],
    ["TaskOperations", "Commands"],
    ["Query + Zustand", "State"],
    ["Repository", "Confirmed"],
  ]
  return (
    <div className="relative rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-black/20">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-bold uppercase tracking-[.16em] text-slate-500">
          Runtime architecture
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-600 dark:text-emerald-400">
          <span className="size-1.5 rounded-full bg-emerald-500" />
          deterministic
        </span>
      </div>
      <div className="space-y-2">
        {nodes.map(([label, meta], index) => (
          <div key={label}>
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm dark:bg-white/5",
                index === 3
                  ? "border-violet-500/30 ring-4 ring-violet-500/5"
                  : "border-slate-200 dark:border-white/10"
              )}
            >
              <span className="grid size-7 place-items-center rounded-lg bg-slate-950 font-mono text-[10px] font-bold text-white dark:bg-white dark:text-slate-950">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-bold">{label}</span>
              <span className="rounded-full bg-slate-100 px-2 py-1 font-mono text-[9px] text-slate-500 dark:bg-white/10 dark:text-slate-400">
                {meta}
              </span>
            </div>
            {index < nodes.length - 1 && (
              <div className="ml-6 h-2 border-l border-dashed border-slate-300 dark:border-white/20" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function Metric({
  label,
  value,
  detail,
  icon: Icon,
  accent,
}: {
  label: string
  value: string
  detail: string
  icon: typeof BookOpen
  accent: Lesson["accent"]
}) {
  const color = accentClasses[accent]
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[.035]">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className={cn("grid size-8 place-items-center rounded-lg", color.soft, color.text)}>
          <Icon className="size-4" />
        </span>
      </div>
      <div className="mt-3 text-2xl font-black tracking-tight">{value}</div>
      <div className="mt-1 text-[11px] text-slate-400">{detail}</div>
    </div>
  )
}

function LessonCard({
  lesson,
  complete,
  onClick,
}: {
  lesson: Lesson
  complete: boolean
  onClick: () => void
}) {
  const accent = accentClasses[lesson.accent]
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-white/[.035]"
    >
      <div
        className={cn(
          "absolute inset-x-0 top-0 h-0.5 opacity-0 transition group-hover:opacity-100",
          accent.solid
        )}
      />
      <div className="flex items-start justify-between gap-3">
        <span className={cn("font-mono text-xs font-bold", accent.text)}>
          {lesson.index}
        </span>
        {complete ? (
          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="size-3.5" />
            Complete
          </span>
        ) : (
          <span className="text-[10px] font-medium text-slate-400">
            {lesson.minutes} min
          </span>
        )}
      </div>
      <h3 className="mt-6 text-base font-black tracking-tight">{lesson.title}</h3>
      <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {lesson.summary}
      </p>
      <div className="mt-5 flex items-center gap-1 text-xs font-bold">
        Study module
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
      </div>
    </button>
  )
}

function StateRow({
  number,
  label,
  note,
  color,
}: {
  number: string
  label: string
  note: string
  color: "emerald" | "amber" | "violet"
}) {
  const colors = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
    amber: "border-amber-400/20 bg-amber-400/10 text-amber-300",
    violet: "border-violet-400/20 bg-violet-400/10 text-violet-300",
  }
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", colors[color])}>
      <span className="text-[10px] opacity-60">{number}</span>
      <span className="font-bold">{label}</span>
      <span className="ml-auto text-[10px] opacity-70">{note}</span>
    </div>
  )
}

function VirtualizerMini() {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-white/[.035]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.18em] text-rose-600 dark:text-rose-400">
            Virtual viewport
          </p>
          <h3 className="mt-2 text-xl font-black tracking-tight">1,000 tasks. 12 DOM rows.</h3>
        </div>
        <span className="grid size-10 place-items-center rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400">
          <Layers3 />
        </span>
      </div>
      <div className="relative mt-6 h-44 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-3 dark:border-white/10 dark:bg-black/30">
        <div className="absolute bottom-3 right-2 top-3 w-1 rounded-full bg-slate-200 dark:bg-white/10">
          <div className="mt-7 h-9 rounded-full bg-rose-500" />
        </div>
        <div className="space-y-2 pr-4">
          {[241, 242, 243, 244].map((row, index) => (
            <div
              key={row}
              className={cn(
                "flex h-8 items-center gap-3 rounded-lg border bg-white px-3 text-[10px] shadow-sm dark:border-white/10 dark:bg-white/5",
                (index === 0 || index === 3) && "opacity-40"
              )}
            >
              <span className="font-mono text-slate-400">#{row}</span>
              <span className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-white/10" />
              <span className="rounded bg-rose-500/10 px-1.5 py-0.5 font-mono text-rose-600 dark:text-rose-300">
                {index === 0 || index === 3 ? "overscan" : "visible"}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function LessonView({
  lesson,
  completed,
  onToggleComplete,
  onNext,
}: {
  lesson: Lesson
  completed: boolean
  onToggleComplete: () => void
  onNext: () => void
}) {
  const accent = accentClasses[lesson.accent]
  return (
    <article className="mx-auto max-w-6xl">
      <header className="border-b border-slate-200 pb-8 dark:border-white/10">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={cn(accent.soft, accent.text, accent.border)}>
            Module {lesson.index}
          </Badge>
          <span className="flex items-center gap-1.5 text-xs text-slate-400">
            <TimerReset className="size-3.5" />
            {lesson.minutes} minutes
          </span>
        </div>
        <h1 className="mt-5 text-balance text-4xl font-black tracking-[-.04em] sm:text-6xl">
          {lesson.title}
        </h1>
        <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-slate-600 sm:text-lg dark:text-slate-300">
          {lesson.summary}
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <Button
            onClick={onToggleComplete}
            className={cn(
              "h-10 rounded-xl px-4",
              completed
                ? "bg-emerald-600 text-white hover:bg-emerald-700"
                : "bg-slate-950 text-white dark:bg-white dark:text-slate-950"
            )}
          >
            {completed ? <CheckCircle2 /> : <Circle />}
            {completed ? "Completed" : "Mark complete"}
          </Button>
          <Button variant="outline" className="h-10 rounded-xl" onClick={onNext}>
            Next module
            <ArrowRight />
          </Button>
        </div>
      </header>

      <section className="grid gap-4 py-8 md:grid-cols-3">
        {lesson.outcomes.map((outcome, index) => (
          <div
            key={outcome}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-white/[.035]"
          >
            <span className={cn("font-mono text-[10px] font-bold", accent.text)}>
              OUTCOME {String(index + 1).padStart(2, "0")}
            </span>
            <p className="mt-3 text-sm font-semibold leading-6">{outcome}</p>
          </div>
        ))}
      </section>

      <SectionHeading
        eyebrow="Concept map"
        title="What you need to understand"
        description="Lead with the mental model, then connect it to code."
      />
      <section className="grid gap-4 md:grid-cols-3">
        {lesson.concepts.map((concept, index) => (
          <div
            key={concept.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-white/[.035]"
          >
            <span className={cn("grid size-8 place-items-center rounded-lg font-mono text-xs font-bold", accent.soft, accent.text)}>
              {index + 1}
            </span>
            <h3 className="mt-5 font-black tracking-tight">{concept.title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">
              {concept.body}
            </p>
          </div>
        ))}
      </section>

      <section className="mt-12 grid gap-5 xl:grid-cols-[minmax(0,1fr)_330px]">
        <div>
          <SectionHeading
            eyebrow="Repository syntax"
            title="Read the real pattern"
            description="Switch examples, copy the snippet, and explain every line aloud."
          />
          <CodeExplorer samples={lesson.code} accent={lesson.accent} />
        </div>
        <div>
          <SectionHeading
            eyebrow="Whiteboard"
            title="Mental model"
            description="Practice this sequence without notes."
          />
          <div className="rounded-2xl border border-slate-200 bg-slate-950 p-5 text-white shadow-xl dark:border-white/10">
            {lesson.mentalModel.map((item, index) => (
              <div key={item}>
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className={cn("size-2 rounded-full", accent.solid)} />
                  <span className="text-xs font-semibold">{item}</span>
                </div>
                {index < lesson.mentalModel.length - 1 && (
                  <div className="ml-[15px] h-3 border-l border-dashed border-white/20" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {lesson.id === "virtual" && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Interactive lab"
            title="See virtualization geometry"
            description="Change the scroll offset and overscan. Watch mounted rows stay bounded while the logical list remains 1,000."
          />
          <VirtualizerLab />
        </section>
      )}

      {lesson.id === "query" && (
        <section className="mt-12">
          <SectionHeading
            eyebrow="Interactive lab"
            title="Test boolean precedence"
            description="Toggle A, B, and C to verify that AND binds before OR."
          />
          <QueryPrecedenceLab />
        </section>
      )}

      <section className="mt-12">
        <SectionHeading
          eyebrow="Interview drill"
          title="Answer before revealing"
          description="Give a direct answer first; add tradeoffs only after the core point."
        />
        <QuestionAccordion questions={lesson.questions} accent={lesson.accent} />
      </section>

      <section className="mt-12 rounded-3xl border border-amber-500/20 bg-amber-500/[.06] p-6">
        <div className="flex items-center gap-2 text-sm font-black text-amber-800 dark:text-amber-300">
          <Zap className="size-4" />
          Common traps
        </div>
        <ul className="mt-4 space-y-3">
          {lesson.pitfalls.map((pitfall) => (
            <li key={pitfall} className="flex gap-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber-500" />
              {pitfall}
            </li>
          ))}
        </ul>
      </section>

      <footer className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-slate-200 py-8 sm:flex-row dark:border-white/10">
        <div>
          <p className="text-sm font-black">
            Can you explain this module without reading?
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Mark it complete, then validate yourself in Drill mode.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onToggleComplete}>
            {completed ? <CheckCircle2 /> : <Circle />}
            {completed ? "Completed" : "Mark complete"}
          </Button>
          <Button onClick={onNext}>
            Continue
            <ArrowRight />
          </Button>
        </div>
      </footer>
    </article>
  )
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string
  title: string
  description: string
}) {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-violet-600 dark:text-violet-400">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-black tracking-tight">{title}</h2>
      <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  )
}

function CodeExplorer({
  samples,
  accent,
}: {
  samples: Lesson["code"]
  accent: Lesson["accent"]
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const active = samples[activeIndex]!
  const color = accentClasses[accent]

  const copy = async () => {
    await navigator.clipboard.writeText(active.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1200)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#0b0e14] shadow-2xl shadow-slate-950/15">
      <div className="flex items-center gap-1 border-b border-white/10 bg-white/[.035] p-2">
        <div className="mr-2 flex gap-1.5 px-1">
          <span className="size-2.5 rounded-full bg-rose-500" />
          <span className="size-2.5 rounded-full bg-amber-400" />
          <span className="size-2.5 rounded-full bg-emerald-500" />
        </div>
        <div className="flex min-w-0 flex-1 overflow-x-auto">
          {samples.map((sample, index) => (
            <button
              key={sample.label}
              onClick={() => setActiveIndex(index)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-medium transition",
                activeIndex === index
                  ? "bg-white/10 text-white"
                  : "text-slate-500 hover:text-slate-300"
              )}
            >
              <FileCode2 className="size-3" />
              {sample.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          className="text-slate-400 hover:bg-white/10 hover:text-white"
          aria-label="Copy code"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2 font-mono text-[10px] text-slate-500">
        <span>{active.file}</span>
        <span className={color.text}>{active.language}</span>
      </div>
      <pre className="max-h-[520px] overflow-auto p-5 text-[12px] leading-6 text-slate-300 sm:text-[13px]">
        <code>{active.code}</code>
      </pre>
    </div>
  )
}

function QuestionAccordion({
  questions,
  accent,
}: {
  questions: InterviewQuestion[]
  accent: Lesson["accent"]
}) {
  const [open, setOpen] = useState<Set<string>>(new Set())
  const color = accentClasses[accent]
  return (
    <div className="space-y-2">
      {questions.map((question, index) => {
        const expanded = open.has(question.id)
        return (
          <div
            key={question.id}
            className={cn(
              "overflow-hidden rounded-2xl border bg-white transition dark:bg-white/[.035]",
              expanded ? color.border : "border-slate-200 dark:border-white/10"
            )}
          >
            <button
              onClick={() =>
                setOpen((current) => {
                  const next = new Set(current)
                  if (next.has(question.id)) next.delete(question.id)
                  else next.add(question.id)
                  return next
                })
              }
              className="flex w-full items-center gap-4 p-4 text-left"
              aria-expanded={expanded}
            >
              <span className={cn("font-mono text-[10px] font-bold", color.text)}>
                Q{String(index + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-sm font-bold">{question.question}</span>
              <ChevronDown
                className={cn(
                  "size-4 text-slate-400 transition-transform",
                  expanded && "rotate-180"
                )}
              />
            </button>
            {expanded && (
              <div className="border-t border-slate-200 px-4 py-4 pl-[4.25rem] text-sm leading-7 text-slate-600 dark:border-white/10 dark:text-slate-300">
                {question.answer}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function VirtualizerLab() {
  const taskCount = 1000
  const rowHeight = 42
  const viewportHeight = 252
  const [scrollOffset, setScrollOffset] = useState(0)
  const [overscan, setOverscan] = useState(2)
  const totalHeight = taskCount * rowHeight
  const visibleCount = Math.ceil(viewportHeight / rowHeight)
  const firstVisible = Math.floor(scrollOffset / rowHeight)
  const start = Math.max(0, firstVisible - overscan)
  const end = Math.min(taskCount, firstVisible + visibleCount + overscan)
  const rows = Array.from({ length: end - start }, (_, index) => start + index)

  return (
    <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[minmax(0,1fr)_300px] dark:border-white/10 dark:bg-white/[.035]">
      <div>
        <div
          className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 dark:border-white/10 dark:bg-black/30"
          style={{ height: viewportHeight }}
        >
          <div
            className="relative"
            style={{
              height: totalHeight,
              transform: `translateY(-${scrollOffset}px)`,
            }}
          >
            {rows.map((row) => {
              const visible = row >= firstVisible && row < firstVisible + visibleCount
              return (
                <div
                  key={row}
                  className={cn(
                    "absolute left-3 right-3 flex items-center gap-3 rounded-lg border bg-white px-3 text-xs shadow-sm transition dark:border-white/10 dark:bg-white/5",
                    !visible && "border-dashed opacity-40"
                  )}
                  style={{
                    height: rowHeight - 6,
                    transform: `translateY(${row * rowHeight + 3}px)`,
                  }}
                >
                  <span className="w-12 font-mono text-[10px] text-slate-400">
                    #{row + 1}
                  </span>
                  <span className="h-1.5 flex-1 rounded-full bg-slate-200 dark:bg-white/10" />
                  <span
                    className={cn(
                      "rounded px-1.5 py-0.5 font-mono text-[9px]",
                      visible
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-300"
                    )}
                  >
                    {visible ? "visible" : "overscan"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <label className="mt-5 block">
          <span className="mb-2 flex justify-between text-xs font-semibold">
            Scroll offset
            <span className="font-mono text-slate-400">{scrollOffset.toLocaleString()}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={totalHeight - viewportHeight}
            step={rowHeight}
            value={scrollOffset}
            onChange={(event) => setScrollOffset(Number(event.target.value))}
            className="w-full accent-violet-600"
          />
        </label>
      </div>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <LabStat label="Logical rows" value="1,000" />
          <LabStat label="DOM rows" value={String(rows.length)} />
          <LabStat label="First visible" value={`#${firstVisible + 1}`} />
          <LabStat label="Total height" value="42,000px" />
        </div>
        <label className="block rounded-xl border border-slate-200 p-3 dark:border-white/10">
          <span className="flex items-center justify-between text-xs font-semibold">
            Overscan
            <span className="font-mono text-violet-600 dark:text-violet-300">
              {overscan} rows
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={8}
            value={overscan}
            onChange={(event) => setOverscan(Number(event.target.value))}
            className="mt-3 w-full accent-violet-600"
          />
        </label>
        <div className="rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-300">
          <p className="font-mono text-[10px] text-cyan-300">mounted range</p>
          <p className="mt-1 font-mono">
            [{start}, {end - 1}]
          </p>
          <p className="mt-3 text-slate-500">
            The logical height never changes. Only the mounted range responds to
            scroll offset and overscan.
          </p>
        </div>
      </div>
    </div>
  )
}

function LabStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-white/10">
      <div className="text-[9px] font-bold uppercase tracking-[.14em] text-slate-400">
        {label}
      </div>
      <div className="mt-1 font-mono text-sm font-bold">{value}</div>
    </div>
  )
}

function QueryPrecedenceLab() {
  const [values, setValues] = useState({ A: false, B: true, C: true })
  const result = values.A || (values.B && values.C)
  const toggle = (key: keyof typeof values) =>
    setValues((current) => ({ ...current, [key]: !current[key] }))
  return (
    <div className="grid gap-5 rounded-3xl border border-slate-200 bg-white p-5 lg:grid-cols-[minmax(0,1fr)_320px] dark:border-white/10 dark:bg-white/[.035]">
      <div className="rounded-2xl bg-slate-950 p-5 text-white">
        <div className="font-mono text-xs text-slate-500">query logic</div>
        <div className="mt-3 font-mono text-xl font-bold sm:text-2xl">
          <span className="text-violet-300">A</span>
          <span className="text-slate-500"> OR </span>
          <span className="text-cyan-300">(B AND C)</span>
        </div>
        <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <LogicNode label="A" value={values.A} onClick={() => toggle("A")} />
          <span className="font-mono text-xs text-slate-500">OR</span>
          <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
            <div className="mb-2 text-center font-mono text-[9px] uppercase tracking-widest text-cyan-300">
              AND clause
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
              <LogicNode label="B" value={values.B} onClick={() => toggle("B")} />
              <span className="font-mono text-[10px] text-slate-500">AND</span>
              <LogicNode label="C" value={values.C} onClick={() => toggle("C")} />
            </div>
          </div>
        </div>
      </div>
      <div className="flex flex-col justify-between rounded-2xl border border-slate-200 p-5 dark:border-white/10">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[.18em] text-slate-400">
            Evaluation
          </p>
          <div className="mt-4 space-y-2 font-mono text-sm">
            <div className="flex justify-between">
              <span>B AND C</span>
              <span>{String(values.B && values.C)}</span>
            </div>
            <div className="flex justify-between">
              <span>A OR clause</span>
              <span className={result ? "text-emerald-500" : "text-rose-500"}>
                {String(result)}
              </span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "mt-8 rounded-xl border p-4 text-center",
            result
              ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300"
          )}
        >
          <span className="text-xs font-semibold">Task matches?</span>
          <div className="mt-1 text-2xl font-black">{result ? "YES" : "NO"}</div>
        </div>
      </div>
    </div>
  )
}

function LogicNode({
  label,
  value,
  onClick,
}: {
  label: string
  value: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-3 text-center font-mono text-xs font-bold transition",
        value
          ? "border-emerald-400/30 bg-emerald-400/15 text-emerald-300"
          : "border-white/10 bg-white/5 text-slate-500"
      )}
    >
      {label} = {String(value)}
    </button>
  )
}

function FlowLab() {
  const [selectedFlowId, setSelectedFlowId] = useState(flows[0]!.id)
  const [step, setStep] = useState(0)
  const flow = flows.find((item) => item.id === selectedFlowId) ?? flows[0]!
  const active = flow.steps[step]!
  const color = accentClasses[flow.accent]

  const selectFlow = (id: string) => {
    setSelectedFlowId(id)
    setStep(0)
  }

  return (
    <div className="mx-auto max-w-7xl">
      <header>
        <Badge className="border-cyan-500/20 bg-cyan-500/10 text-cyan-700 dark:text-cyan-300">
          <Network />
          Interactive system traces
        </Badge>
        <h1 className="mt-5 text-4xl font-black tracking-[-.04em] sm:text-6xl">
          Follow state as it moves.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Interviewers rarely stop at “what library did you use?” Step through
          ownership, state transitions, and recovery paths.
        </p>
      </header>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {flows.map((item) => (
          <button
            key={item.id}
            onClick={() => selectFlow(item.id)}
            className={cn(
              "shrink-0 rounded-xl border px-4 py-2.5 text-left transition",
              item.id === flow.id
                ? cn(accentClasses[item.accent].soft, accentClasses[item.accent].border)
                : "border-slate-200 bg-white hover:bg-slate-50 dark:border-white/10 dark:bg-white/[.035] dark:hover:bg-white/[.06]"
            )}
          >
            <span className="block text-xs font-bold">{item.title}</span>
            <span className="mt-0.5 block text-[10px] text-slate-400">
              {item.steps.length} transitions
            </span>
          </button>
        ))}
      </div>

      <section className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-950/5 dark:border-white/10 dark:bg-white/[.035]">
        <div className="grid xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="p-5 sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className={cn("text-[10px] font-bold uppercase tracking-[.2em]", color.text)}>
                  {flow.title}
                </p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">
                  {flow.summary}
                </h2>
              </div>
              <span className="font-mono text-xs text-slate-400">
                {step + 1}/{flow.steps.length}
              </span>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {flow.steps.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => setStep(index)}
                  className={cn(
                    "relative rounded-2xl border p-4 text-left transition",
                    index === step
                      ? cn(color.border, color.soft, "shadow-lg", color.glow)
                      : index < step
                        ? "border-emerald-500/20 bg-emerald-500/[.06]"
                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/[.025]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "grid size-7 place-items-center rounded-full border font-mono text-[10px] font-bold",
                        index < step
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                          : index === step
                            ? cn(color.border, color.text)
                            : "border-slate-200 text-slate-400 dark:border-white/10"
                      )}
                    >
                      {index < step ? <Check className="size-3.5" /> : index + 1}
                    </span>
                    {index === step && (
                      <span className={cn("size-2 animate-pulse rounded-full", color.solid)} />
                    )}
                  </div>
                  <div className="mt-5 text-sm font-black">{item.label}</div>
                  <div className="mt-1 font-mono text-[9px] text-slate-400">
                    {item.owner}
                  </div>
                </button>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                disabled={step === 0}
                onClick={() => setStep((value) => Math.max(0, value - 1))}
              >
                <ArrowLeft />
                Previous
              </Button>
              <Button
                onClick={() =>
                  setStep((value) => (value + 1 >= flow.steps.length ? 0 : value + 1))
                }
              >
                {step + 1 >= flow.steps.length ? <RotateCcw /> : <ArrowRight />}
                {step + 1 >= flow.steps.length ? "Replay flow" : "Next transition"}
              </Button>
            </div>
          </div>

          <div className="border-t border-slate-200 bg-slate-950 p-6 text-white xl:border-l xl:border-t-0 dark:border-white/10">
            <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[.16em] text-slate-500">
              <span className={cn("size-2 rounded-full", color.solid)} />
              Active transition
            </div>
            <div className="mt-8 font-mono text-xs text-slate-500">
              step_{String(step + 1).padStart(2, "0")}
            </div>
            <h3 className="mt-2 text-2xl font-black tracking-tight">{active.label}</h3>
            <p className="mt-4 text-sm leading-7 text-slate-300">{active.detail}</p>
            <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">
                Owner
              </span>
              <div className="mt-1 font-mono text-sm text-cyan-300">{active.owner}</div>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/5 p-4">
              <span className="text-[9px] font-bold uppercase tracking-[.18em] text-slate-500">
                State after step
              </span>
              <div className="mt-1 font-mono text-sm text-violet-300">{active.state}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

function DrillMode({
  confidence,
  setConfidence,
  masteredCount,
}: {
  confidence: Record<string, Confidence>
  setConfidence: React.Dispatch<React.SetStateAction<Record<string, Confidence>>>
  masteredCount: number
}) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [filter, setFilter] = useState<"all" | "weak" | "mastered">("all")

  const queue = useMemo(() => {
    const filtered =
      filter === "weak"
        ? allQuestions.filter((question) => (confidence[question.id] ?? 0) < 2)
        : filter === "mastered"
          ? allQuestions.filter((question) => confidence[question.id] === 2)
          : [...allQuestions]
    return filtered.sort(
      (left, right) =>
        (confidence[left.id] ?? 0) - (confidence[right.id] ?? 0) ||
        left.id.localeCompare(right.id)
    )
  }, [confidence, filter])

  const question = queue[index % Math.max(1, queue.length)]
  const rate = (value: Confidence) => {
    if (!question) return
    setConfidence((current) => ({ ...current, [question.id]: value }))
    setRevealed(false)
    setIndex((current) => (current + 1) % Math.max(1, queue.length))
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="text-center">
        <Badge className="border-violet-500/20 bg-violet-500/10 text-violet-700 dark:text-violet-300">
          <BrainCircuit />
          Confidence drill
        </Badge>
        <h1 className="mt-5 text-4xl font-black tracking-[-.04em] sm:text-6xl">
          Answer first. Reveal second.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
          Questions with lower confidence automatically rise to the top. Your ratings
          persist in this browser.
        </p>
      </header>

      <div className="mx-auto mt-8 flex max-w-xl items-center rounded-xl border border-slate-200 bg-white p-1 dark:border-white/10 dark:bg-white/[.035]">
        {(
          [
            ["all", `All ${allQuestions.length}`],
            ["weak", "Needs work"],
            ["mastered", `Mastered ${masteredCount}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => {
              setFilter(value)
              setIndex(0)
              setRevealed(false)
            }}
            className={cn(
              "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition",
              filter === value
                ? "bg-slate-950 text-white shadow-sm dark:bg-white dark:text-slate-950"
                : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {question ? (
        <section className="relative mx-auto mt-8 min-h-[480px] max-w-4xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_35px_100px_-45px_rgba(15,23,42,.35)] dark:border-white/10 dark:bg-white/[.035]">
          <div
            className={cn(
              "absolute inset-x-0 top-0 h-1",
              accentClasses[question.accent].solid
            )}
          />
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 dark:border-white/10">
            <div className="flex items-center gap-2">
              <Badge
                className={cn(
                  accentClasses[question.accent].soft,
                  accentClasses[question.accent].text
                )}
              >
                {question.lessonTitle}
              </Badge>
              <span className="font-mono text-[10px] text-slate-400">
                confidence {confidence[question.id] ?? 0}/2
              </span>
            </div>
            <span className="font-mono text-xs text-slate-400">
              {index + 1}/{queue.length}
            </span>
          </div>
          <div className="flex min-h-[410px] flex-col p-6 sm:p-10">
            <div className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
                <Clipboard className="size-4" />
              </span>
              <h2 className="text-balance text-2xl font-black leading-tight tracking-tight sm:text-4xl">
                {question.question}
              </h2>
            </div>

            {!revealed ? (
              <div className="flex flex-1 flex-col items-center justify-center py-12 text-center">
                <div className="grid size-16 place-items-center rounded-full border border-dashed border-slate-300 text-slate-400 dark:border-white/20">
                  <BrainCircuit className="size-6" />
                </div>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-500 dark:text-slate-400">
                  Say the direct answer aloud. Then add one design tradeoff or
                  production limitation.
                </p>
                <Button
                  size="lg"
                  onClick={() => setRevealed(true)}
                  className="mt-6 h-11 rounded-xl px-5"
                >
                  Reveal model answer
                  <ChevronDown />
                </Button>
              </div>
            ) : (
              <div className="mt-8 flex-1">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[.06] p-5 sm:p-6">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[.16em] text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="size-4" />
                    Model answer
                  </div>
                  <p className="mt-4 text-sm leading-7 text-slate-700 sm:text-base dark:text-slate-200">
                    {question.answer}
                  </p>
                </div>
                <div className="mt-6">
                  <p className="text-center text-xs font-semibold text-slate-400">
                    How confident was your answer?
                  </p>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <ConfidenceButton
                      label="Again"
                      detail="Missed it"
                      value={0}
                      onClick={() => rate(0)}
                    />
                    <ConfidenceButton
                      label="Good"
                      detail="Mostly right"
                      value={1}
                      onClick={() => rate(1)}
                    />
                    <ConfidenceButton
                      label="Mastered"
                      detail="Interview ready"
                      value={2}
                      onClick={() => rate(2)}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      ) : (
        <div className="mx-auto mt-8 max-w-xl rounded-3xl border border-emerald-500/20 bg-emerald-500/[.06] p-10 text-center">
          <CheckCircle2 className="mx-auto size-10 text-emerald-600" />
          <h2 className="mt-4 text-xl font-black">Nothing in this queue.</h2>
          <p className="mt-2 text-sm text-slate-500">
            Change the filter or reset a question rating.
          </p>
        </div>
      )}
    </div>
  )
}

function ConfidenceButton({
  label,
  detail,
  value,
  onClick,
}: {
  label: string
  detail: string
  value: Confidence
  onClick: () => void
}) {
  const styles = [
    "border-rose-500/20 bg-rose-500/[.06] text-rose-700 hover:bg-rose-500/10 dark:text-rose-300",
    "border-amber-500/20 bg-amber-500/[.06] text-amber-700 hover:bg-amber-500/10 dark:text-amber-300",
    "border-emerald-500/20 bg-emerald-500/[.06] text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-300",
  ]
  return (
    <button
      onClick={onClick}
      className={cn("rounded-xl border p-3 text-center transition", styles[value])}
    >
      <span className="block text-xs font-black">{label}</span>
      <span className="mt-0.5 hidden text-[9px] opacity-70 sm:block">{detail}</span>
    </button>
  )
}
