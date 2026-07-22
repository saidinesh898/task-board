"use client"

import { useEffect, useState } from "react"
import { Activity, Bug, ChevronDown, ChevronUp, FlaskConical, Play, RotateCcw, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBoardStore } from "@/stores/board-store"
import { PEOPLE, type SimulationField } from "@/features/tasks/types"
import { useTaskOperations } from "@/features/tasks/task-operations"

const fields: SimulationField[] = ["random", "title", "description", "status", "priority", "assignee", "tags"]

export function DeveloperTools() {
  const state = useBoardStore()
  const { tasks, triggerRemote, resetDataset } = useTaskOperations()
  const [now, setNow] = useState(0)
  useEffect(() => {
    if (!state.autoSimulation) return
    const updateClock = () => setNow(Date.now())
    const kickoff = window.setTimeout(updateClock, 0)
    const interval = window.setInterval(updateClock, 1000)
    return () => { window.clearTimeout(kickoff); window.clearInterval(interval) }
  }, [state.autoSimulation])
  const countdown = state.nextSimulationAt ? Math.max(0, Math.ceil((state.nextSimulationAt - now) / 1000)) : null
  const last = state.events[0]
  return (
    <section className="border-y bg-slate-950 text-slate-100 dark:bg-slate-900">
      <div className="mx-auto max-w-[1600px] px-4">
        <div className="flex min-h-11 items-center gap-3">
          <button onClick={state.toggleDev} className="flex items-center gap-2 text-xs font-semibold tracking-wider"><FlaskConical className="size-4 text-cyan-400" />DEV TOOLS {state.devOpen ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}</button>
          <Badge className="border-slate-700 bg-slate-800 text-slate-200">2s latency</Badge>
          <span className="hidden truncate text-xs text-slate-400 sm:block">{last ? `${last.actor}: ${last.result} · ${last.taskTitle}` : "Simulation paused until you trigger it"}</span>
          <div className="ml-auto flex items-center gap-2 text-xs"><Activity className="size-3.5 text-cyan-400" />{state.pending.length} pending</div>
        </div>
        {state.devOpen && <div className="grid gap-4 border-t border-slate-800 py-4 lg:grid-cols-[1fr_1.4fr_1fr]">
          <DevGroup title="Emulation">
            <DevSelect label="Acting as" value={state.activeUser} onChange={(value) => state.setDevOption("activeUser", value)} options={PEOPLE.map((value) => [value, value])} />
            <DevSelect label="Remote user" value={state.remoteUser} onChange={(value) => state.setDevOption("remoteUser", value)} options={[["random", "Random"], ...PEOPLE.filter((person) => person !== state.activeUser).map((value) => [value, value] as [string, string])]} />
            <DevSelect label="Changed field" value={state.simulationField} onChange={(value) => state.setDevOption("simulationField", value)} options={fields.map((value) => [value, value === "random" ? "Random field" : value[0].toUpperCase() + value.slice(1)])} />
          </DevGroup>
          <DevGroup title="Remote activity">
            <DevSelect label="Target task" value={state.targetTaskId} onChange={(value) => state.setDevOption("targetTaskId", value)} options={[["random", "Random task"], ...tasks.slice(0, 100).map((task) => [task.id, task.title] as [string, string])]} />
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => triggerRemote("manual")}><Play />Trigger update</Button>
              <Button size="sm" variant="secondary" disabled={!state.selectedTaskId || !state.draftDirty} onClick={() => triggerRemote("conflict", state.selectedTaskId ?? undefined)}><Bug />Trigger conflict</Button>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-slate-700 px-3 py-2"><Switch checked={state.autoSimulation} onCheckedChange={(value) => { state.setDevOption("autoSimulation", value); state.setDevOption("nextSimulationAt", null) }} /><span className="text-xs">Auto simulation {state.autoSimulation ? `· next in ${countdown ?? "…"}s` : "paused"}</span></div>
          </DevGroup>
          <DevGroup title="Network and data">
            <DevSelect label="Next response" value={state.failureMode} onChange={(value) => state.setDevOption("failureMode", value)} options={[["random", "Random · 10% fail"], ["success", "Force next success"], ["failure", "Force next failure"]]} />
            <div className="flex flex-wrap gap-2"><Button size="sm" variant="secondary" onClick={() => resetDataset(state.datasetSize === 30 ? 1000 : 30)}>{state.datasetSize === 30 ? "Load 1,000 tasks" : "Load 30 tasks"}</Button><Button size="sm" variant="ghost" onClick={state.clearEvents}><Trash2 />Clear log</Button><Button size="sm" variant="ghost" onClick={() => { if (confirm("Reset all local task-board data?")) { localStorage.removeItem("task-board:query-cache:v1"); state.resetClient(); resetDataset(30) } }}><RotateCcw />Reset</Button></div>
            <div className="max-h-20 overflow-auto text-[11px] text-slate-400">{state.events.slice(0, 4).map((event) => <div key={event.id}>{new Date(event.timestamp).toLocaleTimeString()} · {event.actor} · {event.result}</div>)}</div>
          </DevGroup>
        </div>}
      </div>
    </section>
  )
}

function DevGroup({ title, children }: { title: string; children: React.ReactNode }) { return <div className="space-y-2"><h3 className="text-[11px] font-semibold uppercase tracking-widest text-cyan-400">{title}</h3>{children}</div> }
function DevSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) {
  return <div className="flex items-center gap-2"><span className="w-24 shrink-0 text-xs text-slate-400">{label}</span><Select value={value} onValueChange={(next) => next && onChange(next)}><SelectTrigger className="w-full border-slate-700 bg-slate-900 text-slate-100"><SelectValue /></SelectTrigger><SelectContent>{options.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}</SelectContent></Select></div>
}
