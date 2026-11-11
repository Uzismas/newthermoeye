"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnalysisView } from "./components/analysis-view";
import { CasesView } from "./components/cases-view";
import { Sidebar, Topbar } from "./components/console-layout";
import { DashboardView } from "./components/dashboard-view";
import { TasksView } from "./components/tasks-view";
import { DemoView } from "./components/demo-view";
import { GovernanceView } from "./components/governance-view";
import { InsightsView } from "./components/insights-view";
import { LoginGate } from "./components/login-gate";
import { PerformanceView } from "./components/performance-view";
import { ReportView } from "./components/report-view";
import { formatRiskScore, normalizeCaseRecord } from "./clinical-analysis";
import { defaultCaseReview, mergeServerCases, withTransientPreview } from "./case-state";
import { cases, initialAuditEvents } from "./mock-data";
import type { AuditEvent, CaseAction, CaseActionState, CaseRecord, ReviewRecord, SessionUser, ViewId } from "./types";

const viewIds: ViewId[] = [
  "dashboard",
  "tasks",
  "demo",
  "cases",
  "patients",
  "analysis",
  "report",
  "insights",
  "performance",
  "governance",
  "settings",
];

const viewSet = new Set<string>(viewIds);

const viewTitles: Record<ViewId, string> = {
  dashboard: "Dashboard",
  tasks: "Task Manager",
  demo: "Demo Preview (simulated)",
  cases: "Upload New Scan",
  patients: "Patients",
  analysis: "Analysis Results",
  report: "Clinical Report Preview",
  insights: "Data Insights",
  performance: "Model Performance",
  governance: "Data Management",
  settings: "Settings",
};

type ConsoleStatePayload = {
  auditEvents: AuditEvent[];
  cases: CaseRecord[];
  reviews: Record<string, ReviewRecord>;
  actionStates: Record<string, CaseActionState>;
};

export function ThermoeyeConsole({ initialView = "dashboard" }: { initialView?: ViewId }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [caseRecords, setCaseRecords] = useState<CaseRecord[]>(() => cases.map(normalizeCaseRecord));
  const [selectedCaseId, setSelectedCaseId] = useState(cases[0].id);
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>(initialAuditEvents);
  const [uploadLabel, setUploadLabel] = useState("Drop OCTA/OCT file or choose file");
  const [reviewState, setReviewState] = useState<Record<string, ReviewRecord>>({});
  const [loginError, setLoginError] = useState("");
  const [actionError, setActionError] = useState("");
  const [actionNotice, setActionNotice] = useState("");
  const [isLoginLoading, setIsLoginLoading] = useState(false);
  const [isQueueing, setIsQueueing] = useState(false);
  const queueInFlight = useRef(false);
  const mutationVersion = useRef(0);
  const [isReportDownloading, setIsReportDownloading] = useState(false);
  const [isInsightsDownloading, setIsInsightsDownloading] = useState(false);
  const [analysisAction, setAnalysisAction] = useState<CaseAction | undefined>();
  const [caseActionStates, setCaseActionStates] = useState<Record<string, CaseActionState>>({});
  const [performanceSubview, setPerformanceSubview] = useState("overview");
  const [governanceSubview, setGovernanceSubview] = useState("data-overview");
  const activeView = getViewFromPathname(pathname) ?? initialView;

  const selectedCase = useMemo(
    () => caseRecords.find((caseRecord) => caseRecord.id === selectedCaseId) ?? caseRecords[0] ?? cases[0],
    [caseRecords, selectedCaseId],
  );

  const selectedReview = reviewState[selectedCase.id] ?? defaultCaseReview(selectedCase, sessionUser?.name);

  useEffect(() => {
    document.title = `${viewTitles[activeView]} | Eyezheimer Clinical Console`;
  }, [activeView]);

  useEffect(() => {
    // Credentials must never persist in a shareable URL or browser history.
    // The console login is handled only by the POST /api/session flow.
    const params = new URLSearchParams(window.location.search);
    if (params.has("email") || params.has("password")) {
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [pathname]);

  useEffect(() => {
    let isCurrent = true;

    async function restoreSession() {
      try {
        // Restore in the background so a slow or unavailable session endpoint
        // can never block the login form from rendering.
        const result = await fetchJson<{ user: SessionUser }>("/api/session", {
          signal: createTimeoutSignal(5000),
        });
        if (isCurrent) {
          setSessionUser(result.user);
        }
      } catch {
        // No active mock session is expected on first visit.
      }
    }

    void restoreSession();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadConsoleState() {
      const versionAtRequest = mutationVersion.current;
      try {
        const state = await fetchJson<ConsoleStatePayload>("/api/console-state");
        if (!isCurrent) return;
        const changedSinceRequest = versionAtRequest !== mutationVersion.current;
        setCaseRecords((current) => mergeServerCases(current, state.cases, changedSinceRequest));
        if (!changedSinceRequest) {
          setAuditEvents(state.auditEvents);
          setReviewState(state.reviews);
          setCaseActionStates(state.actionStates ?? {});
        }
      } catch (error) {
        if (isCurrent) {
          setActionError(getErrorMessage(error));
        }
      }
    }

    if (sessionUser) {
      void loadConsoleState();
    }

    return () => {
      isCurrent = false;
    };
  }, [sessionUser]);

  if (!sessionUser) {
    return (
      <LoginGate
        errorMessage={loginError}
        isLoading={isLoginLoading}
        onLogin={handleLogin}
      />
    );
  }

  function navigate(viewId: ViewId) {
    router.push(`/console/${viewId}`, { scroll: false });
  }

  async function handleLogin(credentials: { email: string; password: string }) {
    setIsLoginLoading(true);
    setLoginError("");

    try {
      const result = await fetchJson<{ user: SessionUser }>("/api/session", {
        method: "POST",
        body: JSON.stringify(credentials),
      });
      setSessionUser(result.user);
    } catch (error) {
      setLoginError(getErrorMessage(error));
    } finally {
      setIsLoginLoading(false);
    }
  }

  async function updateReview(review: ReviewRecord) {
    setActionError("");

    try {
      const result = await fetchJson<{ review: ReviewRecord; auditEvents: AuditEvent[] }>(
        `/api/cases/${selectedCase.id}/review`,
        {
          method: "POST",
          body: JSON.stringify(review),
        },
      );
      mutationVersion.current += 1;
      setReviewState((current) => ({ ...current, [selectedCase.id]: result.review }));
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function openReportPreview() {
    setActionError("");

    try {
      const preview = await fetchJson<{ caseRecord: CaseRecord; review: ReviewRecord }>(`/api/cases/${selectedCase.id}/report/preview`);
      setCaseRecords((current) => current.map((item) => item.id === preview.caseRecord.id ? withTransientPreview(preview.caseRecord, item) : item));
      setReviewState((current) => ({ ...current, [preview.caseRecord.id]: preview.review }));
      const result = await postAudit(`Report preview opened for ${selectedCase.id}`);
      setAuditEvents(result.auditEvents);
      navigate("report");
    } catch (error) {
      setActionError(getErrorMessage(error));
    }
  }

  async function downloadReportMock() {
    setIsReportDownloading(true);
    setActionError("");

    try {
      const report = await fetchDownload(`/api/cases/${selectedCase.id}/report/download`, {
        method: "POST",
      });
      saveBlob(report.blob, report.fileName);
      const state = await fetchJson<ConsoleStatePayload>("/api/console-state");
      setAuditEvents(state.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsReportDownloading(false);
    }
  }

  async function downloadInsightsReport() {
    setIsInsightsDownloading(true);
    setActionError("");

    try {
      const imageDataUrl = selectedCase.uploadedImageUrl
        ? await imageUrlToJpegDataUrl(selectedCase.uploadedImageUrl)
        : undefined;
      const report = await fetchDownload("/api/insights/report/download", {
        method: "POST",
        body: JSON.stringify({ caseId: selectedCase.id, imageDataUrl }),
      });
      saveBlob(report.blob, report.fileName);
      const state = await fetchJson<ConsoleStatePayload>("/api/console-state");
      setAuditEvents(state.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setIsInsightsDownloading(false);
    }
  }

  async function handleAnalysisAction(action: CaseAction) {
    setActionError("");
    setActionNotice("");
    if (action === "delete_scan" && !window.confirm("Delete this scan? This action cannot be undone.")) return;

    setAnalysisAction(action);
    try {
      if (action === "export_dicom") {
        const result = await fetchDownload(`/api/cases/${selectedCase.id}/dicom`, { method: "POST" });
        saveBlob(result.blob, result.fileName);
        setActionNotice("De-identified DICOM export downloaded.");
      } else {
        const result = await fetchJson<ConsoleStatePayload>(`/api/cases/${selectedCase.id}/actions`, {
          method: "POST",
          body: JSON.stringify({ action }),
        });
        mutationVersion.current += 1;
        setCaseRecords((current) => result.cases.map((item) => {
          const previous = current.find((candidate) => candidate.id === item.id);
          return previous ? withTransientPreview(item, previous) : normalizeCaseRecord(item);
        }));
        setCaseActionStates(result.actionStates ?? {});
        setAuditEvents(result.auditEvents);
        setReviewState(result.reviews ?? {});
        if (action === "delete_scan") {
          const nextCase = result.cases[0];
          if (nextCase) setSelectedCaseId(nextCase.id);
          setActionNotice("Scan deleted and audit log updated.");
          navigate("dashboard");
        } else {
          setActionNotice(action === "add_to_patient" ? "Scan added to the patient record." : "Second review request sent.");
        }
      }
      if (action === "export_dicom") {
        const state = await fetchJson<ConsoleStatePayload>("/api/console-state");
        setAuditEvents(state.auditEvents);
      }
    } catch (error) {
      setActionError(getErrorMessage(error));
    } finally {
      setAnalysisAction(undefined);
    }
  }

  async function createUploadedDemoCase(caseRecord: CaseRecord, sourceFile: File) {
    if (queueInFlight.current) throw new Error("A case save is already in progress.");
    queueInFlight.current = true;
    setIsQueueing(true);
    setActionError("");

    try {
      const form = new FormData();
      form.append("caseRecord", JSON.stringify(caseRecord));
      form.append("persistApprovedDemo", "true");
      form.append("source", sourceFile, sourceFile.name);
      const result = await fetchJson<{ status: string; caseRecord: CaseRecord; auditEvents: AuditEvent[]; label: string; storage?: { durable?: boolean } }>("/api/uploads/queue", {
        method: "POST",
        body: form,
      });
      if (result.status !== "saved" || result.caseRecord?.id !== caseRecord.id) throw new Error("The server did not confirm this case was saved.");
      const savedCase = withTransientPreview(result.caseRecord, caseRecord);
      mutationVersion.current += 1;
      setCaseRecords((current) => [savedCase, ...current.filter((item) => item.id !== savedCase.id)]);
      setSelectedCaseId(savedCase.id);
      setReviewState((current) => ({ ...current, [savedCase.id]: defaultCaseReview(savedCase, sessionUser?.name) }));
      setUploadLabel(result.label);
      setAuditEvents(result.auditEvents);
      setActionNotice(result.storage?.durable ? "Approved demo result saved in private local storage." : "Research result saved in temporary server memory.");
      navigate("analysis");
    } catch (error) {
      setActionError(getErrorMessage(error));
      throw error;
    } finally {
      queueInFlight.current = false;
      setIsQueueing(false);
    }
  }

  async function logout() {
    try {
      await fetchJson("/api/session", { method: "DELETE" });
    } catch {
      // Local logout should still clear the UI if the mock API is unavailable.
    }

    setSessionUser(null);
    navigate("dashboard");
  }

  async function exportAudit() {
    setActionError("");

    try {
      const result = await postAudit("Audit export requested by pilot administrator");
      setAuditEvents(result.auditEvents);
    } catch (error) {
      setActionError(getErrorMessage(error));
    }

    navigate("governance");
  }

  return (
    <div className="app-shell">
      <Sidebar
        activeView={activeView}
        activeSubview={activeView === "performance" ? performanceSubview : activeView === "governance" ? governanceSubview : undefined}
        onSubviewClick={(sub) => {
          if (activeView === "performance") setPerformanceSubview(sub);
          if (activeView === "governance") setGovernanceSubview(sub);
        }}
      />

      <main className="workspace">
        <Topbar
          onNavigate={navigate}
          user={sessionUser}
          onLogout={logout}
          onAuditExport={exportAudit}
        />

        {actionError ? (
          <p className="workspace-alert" role="alert">
            {actionError}
          </p>
        ) : null}
        {actionNotice ? (
          <p className="workspace-notice" role="status">
            {actionNotice}
          </p>
        ) : null}

        {activeView === "dashboard" ? (
          <DashboardView
            key={selectedCase.id}
            cases={caseRecords}
            reviews={reviewState}
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            onCaseSelect={setSelectedCaseId}
            onNavigate={navigate}
            reviewer={sessionUser.name}
            onReviewSubmit={updateReview}
            onPreviewReport={openReportPreview}
          />
        ) : null}

        {activeView === "tasks" ? (
          <TasksView
            cases={caseRecords}
            reviews={reviewState}
            reviewer={sessionUser.name}
            onOpen={(caseId, view) => {
              setSelectedCaseId(caseId);
              navigate(view);
            }}
          />
        ) : null}

        {activeView === "demo" ? <DemoView /> : null}

        {activeView === "cases" ? (
          <CasesView
            errorMessage={actionError}
            isQueueing={isQueueing}
            uploadLabel={uploadLabel}
            onCreateDemoCase={createUploadedDemoCase}
            onFileSelected={setUploadLabel}
          />
        ) : null}

        {activeView === "analysis" ? (
          <AnalysisView
            actionState={caseActionStates[selectedCase.id]}
            activeAction={analysisAction}
            onAction={handleAnalysisAction}
            selectedCase={selectedCase}
          />
        ) : null}
        {activeView === "patients" ? (
          <PatientsView
            cases={caseRecords}
            onCaseSelect={(caseId) => {
              setSelectedCaseId(caseId);
              navigate("analysis");
            }}
          />
        ) : null}
        {activeView === "insights" ? (
          <InsightsView isExporting={isInsightsDownloading} onExport={downloadInsightsReport} />
        ) : null}
        {activeView === "performance" ? <PerformanceView subview={performanceSubview} onSubviewChange={setPerformanceSubview} /> : null}
        {activeView === "governance" ? <GovernanceView auditEvents={auditEvents} subview={governanceSubview} onSubviewChange={setGovernanceSubview} /> : null}
        {activeView === "settings" ? <SettingsView /> : null}
        {activeView === "report" ? (
          <ReportView
            selectedCase={selectedCase}
            selectedReview={selectedReview}
            isDownloading={isReportDownloading}
            onBack={navigate}
            onDownload={downloadReportMock}
          />
        ) : null}
      </main>
    </div>
  );
}

function getViewFromPathname(pathname: string): ViewId | null {
  const segment = pathname.split("/").filter(Boolean).at(1);
  return segment && viewSet.has(segment) ? (segment as ViewId) : null;
}

function PatientsView({ cases, onCaseSelect }: { cases: CaseRecord[]; onCaseSelect: (caseId: string) => void }) {
  return (
    <section className="view active" aria-labelledby="patients-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Patient registry</p>
          <h1 id="patients-title">Patients</h1>
        </div>
        <p className="section-note">De-identified screening queue scoped to Bangkok Neurology Hospital.</p>
      </div>

      <div className="patient-grid">
        {cases.map((caseRecord) => (
          <article className="panel patient-card" key={caseRecord.id}>
            <div className="patient-avatar" aria-hidden="true">
              {caseRecord.sex}
            </div>
            <div>
              <h2>{caseRecord.id.replace("TE", "PT")}</h2>
              <p>{caseRecord.age} years · {caseRecord.sex === "F" ? "Female" : "Male"} · {caseRecord.scanType} {caseRecord.eye}</p>
            </div>
            <span className={`risk-chip ${caseRecord.riskLevel}`}>
              {formatRiskScore(caseRecord) === "N/A" ? "N/A" : `${formatRiskScore(caseRecord)} risk`}
            </span>
            <button className="ghost-button wide" type="button" onClick={() => onCaseSelect(caseRecord.id)}>
              Open analysis
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}

async function postAudit(message: string) {
  return fetchJson<{ auditEvents: AuditEvent[] }>("/api/audit", {
    method: "POST",
    body: JSON.stringify({ message }),
  });
}

async function fetchJson<T = unknown>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, {
    ...init,
    headers: init?.body instanceof FormData ? init?.headers : { "Content-Type": "application/json", ...init?.headers },
  });

  const data = (await response.json().catch(() => null)) as { message?: unknown } | T | null;

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data && typeof data.message === "string"
      ? data.message
      : "The clinical console API request failed.";
    throw new Error(message);
  }

  return data as T;
}

function createTimeoutSignal(timeoutMs: number) {
  const controller = new AbortController();
  window.setTimeout(() => controller.abort(), timeoutMs);
  return controller.signal;
}

async function fetchDownload(input: RequestInfo | URL, init?: RequestInit): Promise<{ blob: Blob; fileName: string }> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const data = (await response.json().catch(() => null)) as { message?: unknown } | null;
    const message = data && typeof data.message === "string"
      ? data.message
      : "The report download request failed.";
    throw new Error(message);
  }

  return {
    blob: await response.blob(),
    fileName: getDownloadFileName(response),
  };
}

function saveBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

async function imageUrlToJpegDataUrl(url: string) {
  const response = await fetch(url);
  if (!response.ok) throw new Error("The uploaded scan could not be prepared for the PDF.");

  const source = document.createElement("img");
  const objectUrl = URL.createObjectURL(await response.blob());

  try {
    await new Promise<void>((resolve, reject) => {
      source.onload = () => resolve();
      source.onerror = () => reject(new Error("The uploaded scan could not be decoded."));
      source.src = objectUrl;
    });

    const maxDimension = 1800;
    const sourceWidth = source.naturalWidth || 1200;
    const sourceHeight = source.naturalHeight || 900;
    const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceWidth * scale));
    canvas.height = Math.max(1, Math.round(sourceHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("The uploaded scan could not be prepared for the PDF.");
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.88);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function getDownloadFileName(response: Response) {
  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/i.exec(disposition);
  const contentType = (response.headers.get("Content-Type") ?? "").split(";", 1)[0].trim().toLowerCase();
  const expectedExtension = contentType === "application/dicom"
    ? ".dcm"
    : contentType === "application/pdf"
      ? ".pdf"
      : "";
  const fallback = expectedExtension === ".dcm" ? "thermoeye-export.dcm" : "thermoeye-report.pdf";
  const rawName = match?.[1] ? decodeURIComponent(match[1]) : fallback;
  const safeName = rawName.replace(/[^A-Za-z0-9._-]/g, "-");
  if (!expectedExtension) return safeName;

  // Keep the filename aligned with the response payload. In particular, a
  // DICOM export must never be given a .pdf suffix or the browser will try to
  // open binary DICOM metadata in its PDF viewer.
  const baseName = safeName.replace(/\.(?:pdf|dcm)$/i, "");
  return `${baseName}${expectedExtension}`;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected clinical console error.";
}

function SettingsView() {
  return (
    <section className="view active" aria-labelledby="settings-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Workspace settings</p>
          <h1 id="settings-title">Settings</h1>
        </div>
        <p className="section-note">Research prototype settings and temporary session storage.</p>
      </div>

      <div className="settings-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Tenant</p>
              <h2>Hospital configuration</h2>
            </div>
            <span className="badge secure">Active</span>
          </div>
          <div className="settings-list">
            <span><strong>Hospital</strong><em>Bangkok Neurology Hospital</em></span>
            <span><strong>Region</strong><em>Thailand pilot</em></span>
            <span><strong>Retention</strong><em>Temporary server memory; reset on restart</em></span>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Analysis scope</p>
              <h2>Research measurements</h2>
            </div>
            <span className="badge">2026.05</span>
          </div>
          <div className="settings-list">
            <span><strong>Disease classification</strong><em>Unavailable; indeterminate</em></span>
            <span><strong>Measurements</strong><em>Vessel segmentation and research proxies</em></span>
            <span><strong>Review approval</strong><em>Required for research report release</em></span>
          </div>
        </section>
      </div>
    </section>
  );
}
