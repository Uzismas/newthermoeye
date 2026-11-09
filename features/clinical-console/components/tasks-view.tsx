import { useMemo, useState } from "react";
import { buildTasks, type TaskKind } from "../tasks";
import type { CaseRecord, ReviewRecord, ViewId } from "../types";
import { SectionHeading } from "./shared";

const kindLabel: Record<TaskKind, string> = {
  review: "Needs review",
  rescan: "Rescan",
  release: "Ready to release",
  "follow-up": "Follow-up",
  "awaiting-rescan": "Waiting",
};

const filters: Array<{ id: "all" | "open" | "done"; label: string }> = [
  { id: "open", label: "Action needed" },
  { id: "done", label: "Waiting / recorded" },
  { id: "all", label: "All" },
];

export function TasksView({
  cases,
  reviews,
  reviewer,
  onOpen,
}: {
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  reviewer: string;
  onOpen: (caseId: string, view: ViewId) => void;
}) {
  const tasks = useMemo(() => buildTasks(cases, reviews, reviewer), [cases, reviews, reviewer]);
  const [filter, setFilter] = useState<"all" | "open" | "done">("open");
  const shown = tasks.filter((task) => filter === "all" || (filter === "open" ? task.priority < 3 : task.priority === 3));
  const counts = { open: tasks.filter((t) => t.priority < 3).length, done: tasks.filter((t) => t.priority === 3).length, all: tasks.length };

  return (
    <section className="view active" aria-labelledby="tasks-title">
      <SectionHeading
        eyebrow="Work queue"
        title={<span id="tasks-title">Task Manager</span>}
        note="Tasks are generated from each case's analysis status and review decision. Nothing here is a diagnosis."
      />

      <div className="task-toolbar" role="group" aria-label="Filter tasks">
        {filters.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`task-filter ${filter === item.id ? "active" : ""}`}
            aria-pressed={filter === item.id}
            onClick={() => setFilter(item.id)}
          >
            {item.label}
            <span className="task-count">{counts[item.id]}</span>
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <div className="panel task-empty">
          <h2>Nothing waiting here</h2>
          <p>
            {tasks.length === 0
              ? "Upload an OCTA image to create the first task. Synthetic reference cases do not create tasks until a real image is analysed."
              : "All tasks in this filter are cleared. Switch filters to see the rest."}
          </p>
        </div>
      ) : (
        <ol className="task-list">
          {shown.map((task) => (
            <li className={`task-item task-${task.kind}`} key={`${task.caseId}-${task.kind}`}>
              <span className={`task-kind task-kind-${task.kind}`}>{kindLabel[task.kind]}</span>
              <div className="task-body">
                <strong>{task.title}</strong>
                <span>{task.caseId} · {task.detail}</span>
              </div>
              <button className="ghost-button compact-action" type="button" onClick={() => onOpen(task.caseId, task.target)}>
                Open case
              </button>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
