"use client"

import { useEffect, useState } from "react"
import { Activity, Bug, ChevronDown, ChevronUp, FlaskConical, Play, RotateCcw, Trash2, UserRoundCheck, Users, WifiOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useBoardStore } from "@/stores/board-store"
import { PEOPLE, type SimulationField } from "@/features/tasks/types"
import { useTaskOperations } from "@/features/tasks/task-operations"
import styles from "./developer-tools.module.css"

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
  const remoteActor = state.remoteUser !== "random" && state.remoteUser !== state.activeUser
    ? state.remoteUser
    : PEOPLE.find((person) => person !== state.activeUser)!
  const targetTask = tasks.find((task) => task.id === state.targetTaskId) ?? tasks[0]
  const setRemotePresence = (mode: "viewing" | "editing") => {
    if (!targetTask) return
    state.upsertPresence({ user: remoteActor, taskId: targetTask.id, mode, remote: true, updatedAt: new Date().toISOString() })
  }
  return (
    <section className={styles.style1}>
      <div className={styles.style2}>
        <div className={styles.style3}>
          <button onClick={state.toggleDev} className={styles.style4}><FlaskConical className={styles.style5} />DEV TOOLS {state.devOpen ? <ChevronUp className={styles.style6} /> : <ChevronDown className={styles.style6} />}</button>
          <Badge className={styles.style7}>2s latency</Badge>
          <span className={styles.style8}>{last ? `${last.actor}: ${last.result} · ${last.taskTitle}` : "Simulation paused until you trigger it"}</span>
          <div className={styles.style9}><Activity className={styles.style10} />{state.pending.length} pending</div>
        </div>
        {state.devOpen && <div className={styles.style11}>
          <DevGroup title="Emulation">
            <DevSelect label="Acting as" value={state.activeUser} onChange={(value) => state.setDevOption("activeUser", value)} options={PEOPLE.map((value) => [value, value])} />
            <DevSelect label="Remote user" value={state.remoteUser} onChange={(value) => state.setDevOption("remoteUser", value)} options={[["random", "Random"], ...PEOPLE.filter((person) => person !== state.activeUser).map((value) => [value, value] as [string, string])]} />
            <DevSelect label="Changed field" value={state.simulationField} onChange={(value) => state.setDevOption("simulationField", value)} options={fields.map((value) => [value, value === "random" ? "Random field" : value[0].toUpperCase() + value.slice(1)])} />
          </DevGroup>
          <DevGroup title="Remote activity">
            <DevSelect label="Target task" value={state.targetTaskId} onChange={(value) => state.setDevOption("targetTaskId", value)} options={[["random", "Random task"], ...tasks.slice(0, 100).map((task) => [task.id, task.title] as [string, string])]} />
            <div className={styles.style12}>
              <Button size="sm" variant="secondary" onClick={() => triggerRemote("manual")}><Play />Trigger update</Button>
              <Button size="sm" variant="secondary" disabled={!state.selectedTaskId || !state.draftDirty} onClick={() => triggerRemote("conflict", state.selectedTaskId ?? undefined)}><Bug />Trigger conflict</Button>
            </div>
            <div className={styles.style12}>
              <Button size="sm" variant="secondary" onClick={() => setRemotePresence("viewing")}><Users />Set viewing presence</Button>
              <Button size="sm" variant="secondary" onClick={() => setRemotePresence("editing")}><UserRoundCheck />Set editing presence</Button>
              <Button size="sm" variant="ghost" onClick={() => state.removePresence(remoteActor)}>Release presence</Button>
            </div>
            <div className={styles.style13}><Switch checked={state.autoSimulation} onCheckedChange={(value) => { state.setDevOption("autoSimulation", value); state.setDevOption("nextSimulationAt", null) }} /><span className={styles.style14}>Auto simulation {state.autoSimulation ? `· next in ${countdown ?? "…"}s` : "paused"}</span></div>
          </DevGroup>
          <DevGroup title="Network and data">
            <DevSelect label="Next response" value={state.failureMode} onChange={(value) => state.setDevOption("failureMode", value)} options={[["random", "Random · 10% fail"], ["success", "Force next success"], ["failure", "Force next failure"]]} />
            <div className={styles.style13}><Switch aria-label="Simulate offline network" checked={state.forcedOffline} onCheckedChange={(value) => state.setDevOption("forcedOffline", value)} /><WifiOff className={styles.style15} /><span className={styles.style14}>Simulated network {state.forcedOffline ? "offline" : "online"}</span></div>
            <div className={styles.style12}><Button size="sm" variant="secondary" onClick={() => resetDataset(state.datasetSize === 30 ? 1000 : 30)}>{state.datasetSize === 30 ? "Load 1,000 tasks" : "Load 30 tasks"}</Button><Button size="sm" variant="ghost" onClick={state.clearEvents}><Trash2 />Clear log</Button><Button size="sm" variant="ghost" onClick={() => { if (confirm("Reset all local task-board data?")) { localStorage.removeItem("task-board:query-cache:v1"); state.resetClient(); resetDataset(30) } }}><RotateCcw />Reset</Button></div>
            <div className={styles.style16}>{state.events.slice(0, 4).map((event) => <div key={event.id}>{new Date(event.timestamp).toLocaleTimeString()} · {event.actor} · {event.result}</div>)}</div>
          </DevGroup>
        </div>}
      </div>
    </section>
  )
}

function DevGroup({ title, children }: { title: string; children: React.ReactNode }) { return <div className={styles.style17}><h3 className={styles.style18}>{title}</h3>{children}</div> }
function DevSelect({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<readonly [string, string]> }) {
  return <div className={styles.style19}><span className={styles.style20}>{label}</span><Select value={value} onValueChange={(next) => next && onChange(next)}><SelectTrigger className={styles.style21}><SelectValue /></SelectTrigger><SelectContent>{options.map(([option, text]) => <SelectItem key={option} value={option}>{text}</SelectItem>)}</SelectContent></Select></div>
}
