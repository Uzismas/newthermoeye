import { defaultCaseReview } from "./case-state";
import type { CaseRecord, ReviewRecord, ViewId } from "./types";

export type TaskKind = "review" | "rescan" | "release" | "follow-up" | "awaiting-rescan";

export type WorkTask = {
  caseId: string;
  kind: TaskKind;
  title: string;
  detail: string;
  target: ViewId;
  priority: 1 | 2 | 3;
};

export type CaseStage = "measured" | "blocked" | "not-evaluated";

/** Every number on the dashboard and Task Manager derives from this, so they always agree. */
export function caseStage(item: CaseRecord): CaseStage {
  const status = item.analysisMetrics?.visionResult?.analysisStatus;
  if (status === "measured") return "measured";
  if (status === "quality_blocked" || status === "modality_blocked") return "blocked";
  return "not-evaluated";
}

export function reviewFor(item: CaseRecord, reviews: Record<string, ReviewRecord>, reviewer?: string): ReviewRecord {
  return reviews[item.id] ?? defaultCaseReview(item, reviewer);
}

export function buildTasks(cases: CaseRecord[], reviews: Record<string, ReviewRecord>, reviewer?: string): WorkTask[] {
  const tasks: WorkTask[] = [];
  for (const item of cases) {
    const stage = caseStage(item);
    const review = reviewFor(item, reviews, reviewer);
    const decision = review.decision;
    if (stage === "blocked" && review.updatedAt === "Not reviewed") {
      tasks.push({ caseId: item.id, kind: "rescan", title: "Image blocked by quality gate", detail: item.analysisMetrics?.visionResult?.failureReason ?? "Upload a clearer OCTA image.", target: "analysis", priority: 1 });
    } else if (decision === "Rescan requested") {
      tasks.push({ caseId: item.id, kind: "awaiting-rescan", title: "Waiting for a new scan", detail: "Rescan was requested. Upload the new image when it arrives.", target: "cases", priority: 3 });
    } else if (decision === "Approved for release") {
      tasks.push({ caseId: item.id, kind: "release", title: "Release research report", detail: "Review approved. Preview and download the PDF.", target: "report", priority: 2 });
    } else if (decision === "Follow-up required") {
      tasks.push({ caseId: item.id, kind: "follow-up", title: "Follow-up recorded", detail: "Check the follow-up window in the review note.", target: "analysis", priority: 3 });
    } else if (stage === "measured") {
      tasks.push({ caseId: item.id, kind: "review", title: "Review vessel measurements", detail: "Segmentation finished. Record a review decision.", target: "analysis", priority: 1 });
    }
    // not-evaluated synthetic fixtures carry no action until a real image is analysed
  }
  return tasks.sort((a, b) => a.priority - b.priority || a.caseId.localeCompare(b.caseId));
}

export function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0;
}
