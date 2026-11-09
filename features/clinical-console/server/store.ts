import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { normalizeCaseRecord } from "../clinical-analysis";
import { canReleaseResearchReport, defaultCaseReview, metadataOnlyCase } from "../case-state";
import { cases, initialAuditEvents } from "../mock-data";
import type { AuditEvent, CaseActionState, CaseRecord, ReviewDecision, ReviewRecord, SessionUser } from "../types";
import {
  decoratePrivateCase,
  getDurableSnapshot,
  loadDurableState,
  persistApprovedCase,
  persistState,
  restoreBackup,
  type PersistedSnapshot,
  removeApprovedCase,
} from "./persistence";

export type ConsoleState = {
  auditEvents: AuditEvent[];
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  actionStates: Record<string, CaseActionState>;
  sessionUser: SessionUser;
  schemaVersion: string;
  durableCaseIds: string[];
};

type ApiErrorCode = "BAD_REQUEST" | "CONFLICT" | "FORBIDDEN" | "NOT_FOUND" | "UNAUTHORIZED";

export const sessionCookieName = "thermoeye_mock_session";
// shortcut: production without THERMOEYE_SESSION_TOKEN derives a stable token from the demo credentials
// (stable so separate serverless route bundles agree); set the env var to a random secret for a real deployment.
export const sessionCookieValue =
  process.env.THERMOEYE_SESSION_TOKEN ??
  (process.env.NODE_ENV === "production"
    ? createHash("sha256")
        .update(`thermoeye-session:${process.env.THERMOEYE_DEMO_EMAIL ?? ""}:${process.env.THERMOEYE_DEMO_PASSWORD ?? "pilot-access"}`)
        .digest("hex")
    : "pilot-doctor");

const sessionUser: SessionUser = {
  name: "Dr. Kritsadapa S.",
  role: "Doctor",
  hospital: "Sirindhorn Memory Clinic",
};

const globalStore = globalThis as typeof globalThis & {
  thermoeyeConsoleState?: ConsoleState;
};

const schemaVersion = "octa-analysis-v3-local-private";

export function getConsoleState(): ConsoleState {
  globalStore.thermoeyeConsoleState ??= {
    auditEvents: [...initialAuditEvents],
    cases: cases.map(metadataOnlyCase),
    reviews: {},
    actionStates: {},
    sessionUser,
    schemaVersion,
    durableCaseIds: [],
  };

  if (globalStore.thermoeyeConsoleState.durableCaseIds.length === 0 && globalStore.thermoeyeConsoleState.schemaVersion === schemaVersion) {
    const restored = loadDurableState();
    const restoredIds = new Set(restored.durableCaseIds);
    globalStore.thermoeyeConsoleState.cases = [
      ...restored.cases,
      ...globalStore.thermoeyeConsoleState.cases.filter((item) => !restoredIds.has(item.id)),
    ];
    globalStore.thermoeyeConsoleState.reviews = { ...globalStore.thermoeyeConsoleState.reviews, ...restored.reviews };
    globalStore.thermoeyeConsoleState.actionStates = { ...globalStore.thermoeyeConsoleState.actionStates, ...restored.actionStates };
    globalStore.thermoeyeConsoleState.auditEvents = [...restored.auditEvents, ...globalStore.thermoeyeConsoleState.auditEvents];
    globalStore.thermoeyeConsoleState.durableCaseIds = restored.durableCaseIds;
  }

  migrateConsoleState(globalStore.thermoeyeConsoleState);
  return globalStore.thermoeyeConsoleState;
}

export function addAudit(message: string): AuditEvent {
  const event = {
    time: new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    message,
  };

  getConsoleState().auditEvents = [event, ...getConsoleState().auditEvents];
  persistCurrentState();
  return event;
}

export function upsertCase(caseRecord: CaseRecord) {
  const state = getConsoleState();
  const normalizedCase = metadataOnlyCase(caseRecord);
  state.cases = [normalizedCase, ...state.cases.filter((item) => item.id !== normalizedCase.id)];
  return normalizedCase;
}

export function insertCase(caseRecord: CaseRecord, options?: { approvedDemo?: { source: Buffer; sourceMime: string; mask?: Buffer; maskMime?: string } }): CaseRecord | null {
  const state = getConsoleState();
  if (state.cases.some((item) => item.id === caseRecord.id)) return null;
  const normalizedCase = metadataOnlyCase(caseRecord);
  if (options?.approvedDemo) {
    const snapshot = loadDurableSnapshot();
    const record = persistApprovedCase({
      caseRecord: normalizedCase,
      source: options.approvedDemo.source,
      sourceMime: options.approvedDemo.sourceMime,
      mask: options.approvedDemo.mask,
      maskMime: options.approvedDemo.maskMime,
      auditEvents: state.auditEvents,
      existing: snapshot,
    });
    state.durableCaseIds = [...new Set([...state.durableCaseIds, normalizedCase.id])];
    state.cases = [normalizedCase, ...state.cases];
    void record;
    return normalizedCase;
  }
  state.cases = [normalizedCase, ...state.cases];
  return normalizedCase;
}

export function persistCurrentState() {
  const state = getConsoleState();
  persistState({ cases: state.cases, reviews: state.reviews, actionStates: state.actionStates, durableCaseIds: state.durableCaseIds, auditEvents: state.auditEvents });
}

export function resetApprovedCase(caseId: string) {
  const state = getConsoleState();
  const removed = removeApprovedCase(caseId, state.auditEvents);
  if (!removed) return false;
  state.cases = state.cases.filter((item) => item.id !== caseId);
  delete state.reviews[caseId];
  delete state.actionStates[caseId];
  state.durableCaseIds = state.durableCaseIds.filter((item) => item !== caseId);
  return true;
}

export function restoreApprovedBackup() {
  const restored = restoreBackup();
  const state = getConsoleState();
  const restoredIds = new Set(restored.durableCaseIds);
  state.cases = [...restored.cases, ...state.cases.filter((item) => !restoredIds.has(item.id))];
  state.reviews = { ...state.reviews, ...restored.reviews };
  state.actionStates = { ...state.actionStates, ...restored.actionStates };
  state.durableCaseIds = [...new Set([...state.durableCaseIds, ...restored.durableCaseIds])];
  state.auditEvents = restored.auditEvents;
  return restored;
}

export function loadDurableSnapshot(): PersistedSnapshot | null {
  return getDurableSnapshot();
}

export function decorateStateCases() {
  const state = getConsoleState();
  return state.cases.map(decoratePrivateCase);
}

export function getDefaultReview(caseId: string, reviewer = "Unassigned"): ReviewRecord {
  const caseRecord = getConsoleState().cases.find((item) => item.id === caseId);
  return caseRecord ? defaultCaseReview(caseRecord, reviewer) : {
    decision: "Pending review", note: "Analysis unavailable.", reviewer, followUpWindow: "Routine", updatedAt: "Not reviewed",
  };
}

export function validateReviewInput(input: unknown): { ok: true; review: ReviewRecord } | { ok: false; message: string } {
  if (!input || typeof input !== "object") {
    return { ok: false, message: "Review payload is required." };
  }

  const record = input as Record<string, unknown>;
  const decision = record.decision;
  const followUpWindow = record.followUpWindow;
  const note = record.note;

  if (!isReviewDecision(decision)) {
    return { ok: false, message: "Review decision is invalid." };
  }

  if (!isFollowUpWindow(followUpWindow)) {
    return { ok: false, message: "Follow-up window is invalid." };
  }

  if (typeof note !== "string" || note.trim().length < 8 || note.length > 600) {
    return { ok: false, message: "Clinical note must be 8-600 characters." };
  }

  return {
    ok: true,
    review: {
      decision,
      followUpWindow,
      note: note.trim(),
      reviewer: getConsoleState().sessionUser.name,
      // Keep persisted review metadata ASCII-stable so the bundled PDF writer
      // cannot silently corrupt locale-specific (for example Thai) month names.
      updatedAt: new Date().toISOString(),
    },
  };
}

export function apiError(code: ApiErrorCode, message: string, status = 400) {
  return NextResponse.json({ code, message }, { status, headers: noStoreHeaders() });
}

export function noStoreHeaders(init?: HeadersInit) {
  return {
    "Cache-Control": "no-store, max-age=0",
    "Pragma": "no-cache",
    ...init,
  };
}

export function requireConsoleSession(request: Request) {
  const cookies = request.headers.get("cookie") ?? "";
  const hasValidSession = cookies
    .split(";")
    .map((cookie) => cookie.trim())
    .includes(`${sessionCookieName}=${sessionCookieValue}`);

  return hasValidSession
    ? null
    : apiError("UNAUTHORIZED", "Clinical console session is not active.", 401);
}

export function isSafeCaseId(value: string) {
  return /^[A-Z0-9-]{4,64}$/.test(value);
}

function isReviewDecision(value: unknown): value is ReviewDecision {
  return (
    value === "Pending review" ||
    value === "Approved for release" ||
    value === "Follow-up required" ||
    value === "Rescan requested"
  );
}

function isFollowUpWindow(value: unknown): value is ReviewRecord["followUpWindow"] {
  return value === "Routine" || value === "30 days" || value === "90 days" || value === "Rescan first";
}

function migrateConsoleState(state: ConsoleState) {
  if (state.schemaVersion === schemaVersion) {
    state.actionStates ??= {};
    return;
  }

  const normalizedCases = state.cases.map(metadataOnlyCase);
  const existingIds = new Set(normalizedCases.map((caseRecord) => caseRecord.id));

  state.cases = [
    ...normalizedCases,
    ...cases.filter((caseRecord) => !existingIds.has(caseRecord.id)).map(normalizeCaseRecord),
  ];
  state.reviews ??= {};
  state.actionStates ??= {};
  // Preserve unrelated reviews and actions; revoke only unsafe legacy release approval.
  for (const caseRecord of state.cases) {
    const review = state.reviews[caseRecord.id];
    if (review?.decision === "Approved for release" && !canReleaseResearchReport(caseRecord)) {
      state.reviews[caseRecord.id] = { ...review, decision: "Pending review", updatedAt: "Approval revoked during analysis contract migration" };
    }
  }
  state.schemaVersion = schemaVersion;
}
