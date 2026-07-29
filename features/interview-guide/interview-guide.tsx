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
import styles from "./interview-guide.module.css"

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
    <div className={styles.style1}>
      <div
        aria-hidden="true"
        className={styles.style2}
      />

      <header className={styles.style3}>
        <div className={styles.style4}>
          <Button
            variant="ghost"
            size="icon"
            className={styles.style5}
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
            className={styles.style6}
          >
            <span className={styles.style7}>
              <BrainCircuit className={styles.style8} />
            </span>
            <span className={styles.style9}>
              <span className={styles.style10}>
                Board Systems Lab
              </span>
              <span className={styles.style11}>
                Interview prep, grounded in your code
              </span>
            </span>
          </Link>

          <nav
            aria-label="Study modes"
            className={styles.style12}
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

          <div className={styles.style13}>
            <div className={styles.style14}>
              <span
                className={styles.style15}
                style={{
                  background: `conic-gradient(rgb(124 58 237) ${completionPercent}%, rgb(226 232 240) 0)`,
                }}
              >
                <span className={styles.style16}>
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
              className={styles.style17}
            >
              <ArrowLeft />
              Board
            </Button>
          </div>
        </div>

        <div className={styles.style18}>
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

      <div className={styles.style19}>
        <aside className={styles.style20}>
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

        <main className={styles.style21}>
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
        <div className={styles.style22}>
          <button
            className={styles.style23}
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Close navigation"
          />
          <aside className={styles.style24}>
            <div className={styles.style25}>
              <span className={styles.style26}>Study map</span>
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
        styles.style27,
        active
          ? styles.style28
          : styles.style29,
        mobile && styles.style30
      )}
    >
      <Icon className={styles.style31} />
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
    <div className={styles.style32}>
      <div className={styles.style33}>
        <div className={styles.style34}>
          <Search className={styles.style35} />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search concepts..."
            className={styles.style36}
          />
        </div>
      </div>
      <div className={styles.style37}>
        <button
          onClick={() => chooseLesson(null)}
          className={cn(
            styles.style38,
            selectedLessonId === null
              ? styles.style39
              : styles.style40
          )}
        >
          <Sparkles className={styles.style41} />
          Overview
        </button>
        <p className={styles.style42}>
          Learning path
        </p>
        <div className={styles.style43}>
          {filteredLessons.map((lesson) => {
            const accent = accentClasses[lesson.accent]
            const active = selectedLessonId === lesson.id
            const done = completed.has(lesson.id)
            return (
              <button
                key={lesson.id}
                onClick={() => chooseLesson(lesson.id)}
                className={cn(
                  styles.style44,
                  active
                    ? cn(accent.soft, accent.text)
                    : styles.style40
                )}
              >
                <span
                  className={cn(
                    styles.style45,
                    active
                      ? cn(accent.border, accent.soft)
                      : styles.style46,
                    done && styles.style47
                  )}
                >
                  {done ? <Check className={styles.style31} /> : lesson.index}
                </span>
                <span className={styles.style48}>
                  <span className={styles.style49}>
                    {lesson.shortTitle}
                  </span>
                  <span className={styles.style50}>
                    {lesson.minutes} min
                  </span>
                </span>
              </button>
            )
          })}
        </div>
        {!filteredLessons.length && (
          <div className={styles.style51}>
            No concepts match “{search}”.
          </div>
        )}
      </div>
      <div className={styles.style52}>
        <button
          onClick={resetProgress}
          className={styles.style53}
        >
          <RotateCcw className={styles.style31} />
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
    <div className={styles.style54}>
      <section className={styles.style55}>
        <div
          aria-hidden="true"
          className={styles.style56}
        />
        <div
          aria-hidden="true"
          className={styles.style57}
        />
        <div className={styles.style58}>
          <div>
            <Badge className={styles.style59}>
              <Sparkles />
              Built from the real repository
            </Badge>
            <h1 className={styles.style60}>
              Understand the board.
              <span className={styles.style61}>
                Defend every decision.
              </span>
            </h1>
            <p className={styles.style62}>
              Ten focused modules, five animated system traces, exact code patterns,
              and a {allQuestions.length}-question confidence drill—designed for a mid-level interview
              with senior follow-ups.
            </p>
            <div className={styles.style63}>
              <Button
                size="lg"
                onClick={onStart}
                className={styles.style64}
              >
                <Play fill="currentColor" />
                Start the learning path
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => onChangeView("flows")}
                className={styles.style65}
              >
                <GitBranch />
                Explore a system flow
              </Button>
            </div>
          </div>
          <ArchitectureMap />
        </div>
      </section>

      <section className={styles.style66}>
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

      <section className={styles.style67}>
        <div className={styles.style68}>
          <div>
            <p className={styles.style69}>
              Guided curriculum
            </p>
            <h2 className={styles.style70}>
              From route shell to production redesign
            </h2>
          </div>
          <Button
            variant="ghost"
            onClick={() => onChangeView("drill")}
            className={styles.style17}
          >
            Jump to drill
            <ArrowRight />
          </Button>
        </div>
        <div className={styles.style71}>
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

      <section className={styles.style72}>
        <div className={styles.style73}>
          <div className={styles.style74}>
            <Layers3 className={styles.style41} />
            The core equation
          </div>
          <div className={styles.style75}>
            <StateRow number="01" label="confirmed" note="durable truth" color="emerald" />
            <div className={styles.style76}>+</div>
            <StateRow number="02" label="pending[]" note="durable intent" color="amber" />
            <div className={styles.style76}>= reduce(applyOperation)</div>
            <StateRow number="03" label="projected" note="visible board" color="violet" />
          </div>
          <p className={styles.style77}>
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
    <div className={styles.style78}>
      <div className={styles.style79}>
        <span className={styles.style80}>
          Runtime architecture
        </span>
        <span className={styles.style81}>
          <span className={styles.style82} />
          deterministic
        </span>
      </div>
      <div className={styles.style83}>
        {nodes.map(([label, meta], index) => (
          <div key={label}>
            <div
              className={cn(
                styles.style84,
                index === 3
                  ? styles.style85
                  : styles.style86
              )}
            >
              <span className={styles.style87}>
                {String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.style88}>{label}</span>
              <span className={styles.style89}>
                {meta}
              </span>
            </div>
            {index < nodes.length - 1 && (
              <div className={styles.style90} />
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
    <div className={styles.style91}>
      <div className={styles.style92}>
        <span className={styles.style93}>
          {label}
        </span>
        <span className={cn(styles.style94, color.soft, color.text)}>
          <Icon className={styles.style41} />
        </span>
      </div>
      <div className={styles.style95}>{value}</div>
      <div className={styles.style96}>{detail}</div>
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
      className={styles.style97}
    >
      <div
        className={cn(
          styles.style98,
          accent.solid
        )}
      />
      <div className={styles.style99}>
        <span className={cn(styles.style100, accent.text)}>
          {lesson.index}
        </span>
        {complete ? (
          <span className={styles.style101}>
            <CheckCircle2 className={styles.style31} />
            Complete
          </span>
        ) : (
          <span className={styles.style102}>
            {lesson.minutes} min
          </span>
        )}
      </div>
      <h3 className={styles.style103}>{lesson.title}</h3>
      <p className={styles.style104}>
        {lesson.summary}
      </p>
      <div className={styles.style105}>
        Study module
        <ArrowRight className={styles.style106} />
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
    emerald: styles.stateEmerald,
    amber: styles.stateAmber,
    violet: styles.stateViolet,
  }
  return (
    <div className={cn(styles.style107, colors[color])}>
      <span className={styles.style108}>{number}</span>
      <span className={styles.style26}>{label}</span>
      <span className={styles.style109}>{note}</span>
    </div>
  )
}

function VirtualizerMini() {
  return (
    <div className={styles.style110}>
      <div className={styles.style92}>
        <div>
          <p className={styles.style111}>
            Virtual viewport
          </p>
          <h3 className={styles.style112}>1,000 tasks. 12 DOM rows.</h3>
        </div>
        <span className={styles.style113}>
          <Layers3 />
        </span>
      </div>
      <div className={styles.style114}>
        <div className={styles.style115}>
          <div className={styles.style116} />
        </div>
        <div className={styles.style117}>
          {[241, 242, 243, 244].map((row, index) => (
            <div
              key={row}
              className={cn(
                styles.style118,
                (index === 0 || index === 3) && styles.style119
              )}
            >
              <span className={styles.style120}>#{row}</span>
              <span className={styles.style121} />
              <span className={styles.style122}>
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
    <article className={styles.style123}>
      <header className={styles.style124}>
        <div className={styles.style125}>
          <Badge className={cn(accent.soft, accent.text, accent.border)}>
            Module {lesson.index}
          </Badge>
          <span className={styles.style126}>
            <TimerReset className={styles.style31} />
            {lesson.minutes} minutes
          </span>
        </div>
        <h1 className={styles.style127}>
          {lesson.title}
        </h1>
        <p className={styles.style128}>
          {lesson.summary}
        </p>
        <div className={styles.style129}>
          <Button
            onClick={onToggleComplete}
            className={cn(
              styles.style130,
              completed
                ? styles.style131
                : styles.style132
            )}
          >
            {completed ? <CheckCircle2 /> : <Circle />}
            {completed ? "Completed" : "Mark complete"}
          </Button>
          <Button variant="outline" className={styles.style133} onClick={onNext}>
            Next module
            <ArrowRight />
          </Button>
        </div>
      </header>

      <section className={styles.style134}>
        {lesson.outcomes.map((outcome, index) => (
          <div
            key={outcome}
            className={styles.style135}
          >
            <span className={cn(styles.style136, accent.text)}>
              OUTCOME {String(index + 1).padStart(2, "0")}
            </span>
            <p className={styles.style137}>{outcome}</p>
          </div>
        ))}
      </section>

      <SectionHeading
        eyebrow="Concept map"
        title="What you need to understand"
        description="Lead with the mental model, then connect it to code."
      />
      <section className={styles.style138}>
        {lesson.concepts.map((concept, index) => (
          <div
            key={concept.title}
            className={styles.style139}
          >
            <span className={cn(styles.style140, accent.soft, accent.text)}>
              {index + 1}
            </span>
            <h3 className={styles.style141}>{concept.title}</h3>
            <p className={styles.style142}>
              {concept.body}
            </p>
          </div>
        ))}
      </section>

      <section className={styles.style143}>
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
          <div className={styles.style144}>
            {lesson.mentalModel.map((item, index) => (
              <div key={item}>
                <div className={styles.style145}>
                  <span className={cn(styles.style146, accent.solid)} />
                  <span className={styles.style147}>{item}</span>
                </div>
                {index < lesson.mentalModel.length - 1 && (
                  <div className={styles.style148} />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {lesson.id === "virtual" && (
        <section className={styles.style67}>
          <SectionHeading
            eyebrow="Interactive lab"
            title="See virtualization geometry"
            description="Change the scroll offset and overscan. Watch mounted rows stay bounded while the logical list remains 1,000."
          />
          <VirtualizerLab />
        </section>
      )}

      {lesson.id === "query" && (
        <section className={styles.style67}>
          <SectionHeading
            eyebrow="Interactive lab"
            title="Test boolean precedence"
            description="Toggle A, B, and C to verify that AND binds before OR."
          />
          <QueryPrecedenceLab />
        </section>
      )}

      <section className={styles.style67}>
        <SectionHeading
          eyebrow="Interview drill"
          title="Answer before revealing"
          description="Give a direct answer first; add tradeoffs only after the core point."
        />
        <QuestionAccordion questions={lesson.questions} accent={lesson.accent} />
      </section>

      <section className={styles.style149}>
        <div className={styles.style150}>
          <Zap className={styles.style41} />
          Common traps
        </div>
        <ul className={styles.style151}>
          {lesson.pitfalls.map((pitfall) => (
            <li key={pitfall} className={styles.style152}>
              <span className={styles.style153} />
              {pitfall}
            </li>
          ))}
        </ul>
      </section>

      <footer className={styles.style154}>
        <div>
          <p className={styles.style155}>
            Can you explain this module without reading?
          </p>
          <p className={styles.style156}>
            Mark it complete, then validate yourself in Drill mode.
          </p>
        </div>
        <div className={styles.style157}>
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
    <div className={styles.style158}>
      <p className={styles.style159}>
        {eyebrow}
      </p>
      <h2 className={styles.style160}>{title}</h2>
      <p className={styles.style161}>
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
    <div className={styles.style162}>
      <div className={styles.style163}>
        <div className={styles.style164}>
          <span className={styles.style165} />
          <span className={styles.style166} />
          <span className={styles.style167} />
        </div>
        <div className={styles.style168}>
          {samples.map((sample, index) => (
            <button
              key={sample.label}
              onClick={() => setActiveIndex(index)}
              className={cn(
                styles.style169,
                activeIndex === index
                  ? styles.style170
                  : styles.style171
              )}
            >
              <FileCode2 className={styles.style172} />
              {sample.label}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={copy}
          className={styles.style173}
          aria-label="Copy code"
        >
          {copied ? <Check /> : <Copy />}
        </Button>
      </div>
      <div className={styles.style174}>
        <span>{active.file}</span>
        <span className={color.text}>{active.language}</span>
      </div>
      <pre className={styles.style175}>
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
    <div className={styles.style83}>
      {questions.map((question, index) => {
        const expanded = open.has(question.id)
        return (
          <div
            key={question.id}
            className={cn(
              styles.style176,
              expanded ? color.border : styles.style86
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
              className={styles.style177}
              aria-expanded={expanded}
            >
              <span className={cn(styles.style136, color.text)}>
                Q{String(index + 1).padStart(2, "0")}
              </span>
              <span className={styles.style88}>{question.question}</span>
              <ChevronDown
                className={cn(
                  styles.style178,
                  expanded && styles.style179
                )}
              />
            </button>
            {expanded && (
              <div className={styles.style180}>
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
    <div className={styles.style181}>
      <div>
        <div
          className={styles.style182}
          style={{ height: viewportHeight }}
        >
          <div
            className={styles.style34}
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
                    styles.style183,
                    !visible && styles.style184
                  )}
                  style={{
                    height: rowHeight - 6,
                    transform: `translateY(${row * rowHeight + 3}px)`,
                  }}
                >
                  <span className={styles.style185}>
                    #{row + 1}
                  </span>
                  <span className={styles.style121} />
                  <span
                    className={cn(
                      styles.style186,
                      visible
                        ? styles.style187
                        : styles.style188
                    )}
                  >
                    {visible ? "visible" : "overscan"}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
        <label className={styles.style189}>
          <span className={styles.style190}>
            Scroll offset
            <span className={styles.style120}>{scrollOffset.toLocaleString()}px</span>
          </span>
          <input
            type="range"
            min={0}
            max={totalHeight - viewportHeight}
            step={rowHeight}
            value={scrollOffset}
            onChange={(event) => setScrollOffset(Number(event.target.value))}
            className={styles.style191}
          />
        </label>
      </div>
      <div className={styles.style192}>
        <div className={styles.style193}>
          <LabStat label="Logical rows" value="1,000" />
          <LabStat label="DOM rows" value={String(rows.length)} />
          <LabStat label="First visible" value={`#${firstVisible + 1}`} />
          <LabStat label="Total height" value="42,000px" />
        </div>
        <label className={styles.style194}>
          <span className={styles.style195}>
            Overscan
            <span className={styles.style196}>
              {overscan} rows
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={8}
            value={overscan}
            onChange={(event) => setOverscan(Number(event.target.value))}
            className={styles.style197}
          />
        </label>
        <div className={styles.style198}>
          <p className={styles.style199}>mounted range</p>
          <p className={styles.style200}>
            [{start}, {end - 1}]
          </p>
          <p className={styles.style201}>
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
    <div className={styles.style202}>
      <div className={styles.style203}>
        {label}
      </div>
      <div className={styles.style204}>{value}</div>
    </div>
  )
}

function QueryPrecedenceLab() {
  const [values, setValues] = useState({ A: false, B: true, C: true })
  const result = values.A || (values.B && values.C)
  const toggle = (key: keyof typeof values) =>
    setValues((current) => ({ ...current, [key]: !current[key] }))
  return (
    <div className={styles.style205}>
      <div className={styles.style206}>
        <div className={styles.style207}>query logic</div>
        <div className={styles.style208}>
          <span className={styles.style209}>A</span>
          <span className={styles.style210}> OR </span>
          <span className={styles.style211}>(B AND C)</span>
        </div>
        <div className={styles.style212}>
          <LogicNode label="A" value={values.A} onClick={() => toggle("A")} />
          <span className={styles.style207}>OR</span>
          <div className={styles.style213}>
            <div className={styles.style214}>
              AND clause
            </div>
            <div className={styles.style215}>
              <LogicNode label="B" value={values.B} onClick={() => toggle("B")} />
              <span className={styles.style216}>AND</span>
              <LogicNode label="C" value={values.C} onClick={() => toggle("C")} />
            </div>
          </div>
        </div>
      </div>
      <div className={styles.style217}>
        <div>
          <p className={styles.style218}>
            Evaluation
          </p>
          <div className={styles.style219}>
            <div className={styles.style220}>
              <span>B AND C</span>
              <span>{String(values.B && values.C)}</span>
            </div>
            <div className={styles.style220}>
              <span>A OR clause</span>
              <span className={result ? styles.style221 : styles.style222}>
                {String(result)}
              </span>
            </div>
          </div>
        </div>
        <div
          className={cn(
            styles.style223,
            result
              ? styles.style224
              : styles.style225
          )}
        >
          <span className={styles.style147}>Task matches?</span>
          <div className={styles.style226}>{result ? "YES" : "NO"}</div>
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
        styles.style227,
        value
          ? styles.style228
          : styles.style229
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
    <div className={styles.style54}>
      <header>
        <Badge className={styles.style230}>
          <Network />
          Interactive system traces
        </Badge>
        <h1 className={styles.style231}>
          Follow state as it moves.
        </h1>
        <p className={styles.style232}>
          Interviewers rarely stop at “what library did you use?” Step through
          ownership, state transitions, and recovery paths.
        </p>
      </header>

      <div className={styles.style233}>
        {flows.map((item) => (
          <button
            key={item.id}
            onClick={() => selectFlow(item.id)}
            className={cn(
              styles.style234,
              item.id === flow.id
                ? cn(accentClasses[item.accent].soft, accentClasses[item.accent].border)
                : styles.style235
            )}
          >
            <span className={styles.style236}>{item.title}</span>
            <span className={styles.style50}>
              {item.steps.length} transitions
            </span>
          </button>
        ))}
      </div>

      <section className={styles.style237}>
        <div className={styles.style238}>
          <div className={styles.style239}>
            <div className={styles.style240}>
              <div>
                <p className={cn(styles.style241, color.text)}>
                  {flow.title}
                </p>
                <h2 className={styles.style160}>
                  {flow.summary}
                </h2>
              </div>
              <span className={styles.style242}>
                {step + 1}/{flow.steps.length}
              </span>
            </div>

            <div className={styles.style243}>
              {flow.steps.map((item, index) => (
                <button
                  key={item.label}
                  onClick={() => setStep(index)}
                  className={cn(
                    styles.style244,
                    index === step
                      ? cn(color.border, color.soft, styles.style245, color.glow)
                      : index < step
                        ? styles.style246
                        : styles.style247
                  )}
                >
                  <div className={styles.style92}>
                    <span
                      className={cn(
                        styles.style248,
                        index < step
                          ? styles.style47
                          : index === step
                            ? cn(color.border, color.text)
                            : styles.style249
                      )}
                    >
                      {index < step ? <Check className={styles.style31} /> : index + 1}
                    </span>
                    {index === step && (
                      <span className={cn(styles.style250, color.solid)} />
                    )}
                  </div>
                  <div className={styles.style251}>{item.label}</div>
                  <div className={styles.style252}>
                    {item.owner}
                  </div>
                </button>
              ))}
            </div>

            <div className={styles.style253}>
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

          <div className={styles.style254}>
            <div className={styles.style255}>
              <span className={cn(styles.style146, color.solid)} />
              Active transition
            </div>
            <div className={styles.style256}>
              step_{String(step + 1).padStart(2, "0")}
            </div>
            <h3 className={styles.style160}>{active.label}</h3>
            <p className={styles.style257}>{active.detail}</p>
            <div className={styles.style258}>
              <span className={styles.style259}>
                Owner
              </span>
              <div className={styles.style260}>{active.owner}</div>
            </div>
            <div className={styles.style261}>
              <span className={styles.style259}>
                State after step
              </span>
              <div className={styles.style262}>{active.state}</div>
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
    <div className={styles.style263}>
      <header className={styles.style264}>
        <Badge className={styles.style265}>
          <BrainCircuit />
          Confidence drill
        </Badge>
        <h1 className={styles.style231}>
          Answer first. Reveal second.
        </h1>
        <p className={styles.style266}>
          Questions with lower confidence automatically rise to the top. Your ratings
          persist in this browser.
        </p>
      </header>

      <div className={styles.style267}>
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
              styles.style268,
              filter === value
                ? styles.style269
                : styles.style270
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {question ? (
        <section className={styles.style271}>
          <div
            className={cn(
              styles.style272,
              accentClasses[question.accent].solid
            )}
          />
          <div className={styles.style273}>
            <div className={styles.style274}>
              <Badge
                className={cn(
                  accentClasses[question.accent].soft,
                  accentClasses[question.accent].text
                )}
              >
                {question.lessonTitle}
              </Badge>
              <span className={styles.style275}>
                confidence {confidence[question.id] ?? 0}/2
              </span>
            </div>
            <span className={styles.style242}>
              {index + 1}/{queue.length}
            </span>
          </div>
          <div className={styles.style276}>
            <div className={styles.style277}>
              <span className={styles.style278}>
                <Clipboard className={styles.style41} />
              </span>
              <h2 className={styles.style279}>
                {question.question}
              </h2>
            </div>

            {!revealed ? (
              <div className={styles.style280}>
                <div className={styles.style281}>
                  <BrainCircuit className={styles.style282} />
                </div>
                <p className={styles.style283}>
                  Say the direct answer aloud. Then add one design tradeoff or
                  production limitation.
                </p>
                <Button
                  size="lg"
                  onClick={() => setRevealed(true)}
                  className={styles.style284}
                >
                  Reveal model answer
                  <ChevronDown />
                </Button>
              </div>
            ) : (
              <div className={styles.style285}>
                <div className={styles.style286}>
                  <div className={styles.style287}>
                    <CheckCircle2 className={styles.style41} />
                    Model answer
                  </div>
                  <p className={styles.style288}>
                    {question.answer}
                  </p>
                </div>
                <div className={styles.style289}>
                  <p className={styles.style290}>
                    How confident was your answer?
                  </p>
                  <div className={styles.style291}>
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
        <div className={styles.style292}>
          <CheckCircle2 className={styles.style293} />
          <h2 className={styles.style294}>Nothing in this queue.</h2>
          <p className={styles.style295}>
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
  const confidenceStyles = [
    styles.confidenceLow,
    styles.confidenceMedium,
    styles.confidenceHigh,
  ]
  return (
    <button
      onClick={onClick}
      className={cn(styles.style296, confidenceStyles[value])}
    >
      <span className={styles.style297}>{label}</span>
      <span className={styles.style298}>{detail}</span>
    </button>
  )
}
