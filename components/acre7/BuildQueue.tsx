"use client";

import { useState } from "react";
import { Check, Circle, ExternalLink } from "lucide-react";

const starterTasks = [
  { id: "layout", label: "Confirm the extracted room layout", detail: "Plan review", done: true },
  { id: "materials", label: "Lock the material direction", detail: "Materials", done: false },
  { id: "panorama", label: "Generate strict 2:1 panoramas", detail: "Image pipeline", done: false },
  { id: "orientation", label: "Calibrate viewpoint headings", detail: "Spatial alignment", done: false },
  { id: "depth", label: "Add shared depth for room travel", detail: "Future spatial layer", done: false },
];

export function BuildQueue() {
  const [tasks, setTasks] = useState(starterTasks);
  const completed = tasks.filter((task) => task.done).length;
  return <section className="build-queue" aria-labelledby="queue-title"><div className="build-queue-head"><div><p className="home-kicker"><span className="home-kicker-line" /> Build queue</p><h2 id="queue-title">What comes next</h2></div><span className="build-queue-count">{completed} / {tasks.length} complete</span></div><div className="build-queue-list">{tasks.map((task) => <label className={task.done ? "build-task done" : "build-task"} key={task.id}><input type="checkbox" checked={task.done} onChange={() => setTasks((current) => current.map((item) => item.id === task.id ? { ...item, done: !item.done } : item))} /><span className="build-task-check">{task.done ? <Check size={14} /> : <Circle size={14} />}</span><span><strong>{task.label}</strong><small>{task.detail}</small></span></label>)}</div><a className="linear-link" href="https://linear.app/entroprox" target="_blank" rel="noreferrer"><span>Linear workspace connected</span><ExternalLink size={14} /></a></section>;
}
