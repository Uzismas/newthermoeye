"use client";

import { type CSSProperties } from "react";
import type { AuditEvent } from "../types";
import { clinicalModelVersion } from "../clinical-analysis";
import { PanelHeader, SectionHeading } from "./shared";

const GOV_TABS = [
  { id: "data-overview",    label: "Data Overview" },
  { id: "data-sources",     label: "Data Sources" },
  { id: "deidentification", label: "De-identification" },
  { id: "consent",          label: "Consent Management" },
  { id: "usage-log",        label: "Data Usage Log" },
];

export function GovernanceView({
  auditEvents,
  subview = "data-overview",
  onSubviewChange,
}: {
  auditEvents: AuditEvent[];
  subview?: string;
  onSubviewChange?: (sub: string) => void;
}) {
  return (
    <section className="view active" aria-labelledby="governance-title">
      <SectionHeading
        eyebrow="Manage data lifecycle, privacy, and model training"
        title="Data Management"
        note="The platform is the processor. Hospitals remain the data owners."
      />

      <section className="ops-hero governance-ops" aria-labelledby="governance-ops-title">
        <div className="ops-hero-copy">
          <p className="eyebrow">Privacy and data operations</p>
          <h2 id="governance-ops-title">Every scan is traceable from upload to model use</h2>
          <p>Keep raw files quarantined, remove direct identifiers, enforce consent purpose, and audit every export.</p>
        </div>
        <div className="ops-status-grid" aria-label="Governance highlights">
          <span><strong>100%</strong><em>De-ID required</em><small>Before analysis or training</small></span>
          <span><strong>24</strong><em>Exports this month</em><small>All logged with user and purpose</small></span>
          <span><strong>91.2%</strong><em>Quality pass rate</em><small>Failed scans blocked from AI</small></span>
          <span><strong>2.3%</strong><em>Metadata remediation</em><small>Incomplete fields queued</small></span>
        </div>
      </section>

      <div className="tab-strip" role="tablist" aria-label="Data management sections">
        {GOV_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={subview === tab.id}
            className={subview === tab.id ? "active" : ""}
            onClick={() => onSubviewChange?.(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="view-pane" key={subview}>
        {subview === "data-overview"    && <DataOverviewTab auditEvents={auditEvents} />}
        {subview === "data-sources"     && <DataSourcesTab />}
        {subview === "deidentification" && <DeidentTab />}
        {subview === "consent"          && <ConsentTab />}
        {subview === "usage-log"        && <UsageLogTab auditEvents={auditEvents} />}
      </div>
    </section>
  );
}

/* ── Sub-tabs ─────────────────────────────────────────────────────────────── */

function DataOverviewTab({ auditEvents }: { auditEvents: AuditEvent[] }) {
  return (
    <>
      <div className="workflow-strip" aria-label="Data governance workflow">
        {[
          ["Raw upload",  "Encrypted quarantine",     "done"],
          ["Consent",     "Screening + research",     "done"],
          ["De-ID",       "Direct PHI removed",       "done"],
          ["Quality gate","Artifacts blocked",        "active"],
          ["AI analysis", "Doctor-review only",       "pending"],
          ["Audit log",   "Append-only events",       "done"],
        ].map(([label, detail, state]) => (
          <span className="workflow-step" data-state={state} key={label}>
            <strong>{label}</strong>
            <small>{detail}</small>
          </span>
        ))}
      </div>
      <div className="governance-dashboard-grid">
        <section className="panel" aria-labelledby="data-donut-title">
          <PanelHeader eyebrow="Data Overview" title="Dataset Distribution" badge="28,541 records" />
          <div className="donut-chart large data-donut" aria-label="Data distribution"><strong>28,541</strong><span>Total records</span></div>
          <div className="donut-legend compact">
            <span><i className="dot blue-dot" /> Training Set <strong>18,732 (65.7%)</strong></span>
            <span><i className="dot green-dot" /> Validation Set <strong>4,125 (14.5%)</strong></span>
            <span><i className="dot amber-dot" /> Test Set <strong>3,214 (11.3%)</strong></span>
            <span><i className="dot purple-dot" /> External Set <strong>2,470 (8.6%)</strong></span>
          </div>
        </section>
        <section className="panel" aria-labelledby="data-quality-title">
          <PanelHeader eyebrow="Data Quality" title="Data Quality Summary" badge="Fresh" />
          <div className="quality-list">
            <QItem label="Images Passed Quality Check" value="91.2%" />
            <QItem label="Average Image Quality Score" value="0.87 / 1.00" />
            <QItem label="Duplicate Rate" value="1.8%" />
            <QItem label="Incomplete Metadata" value="2.3%" />
          </div>
          <div className="secure-note">All data de-identified · PDPA &amp; HIPAA compliant</div>
        </section>
        <section className="panel wide-panel" aria-labelledby="growth-title">
          <PanelHeader eyebrow="Data Growth" title="Cumulative Record Growth" badge="Jan 2024 → May 2025" />
          <div className="growth-chart" aria-label="Data growth over time">
            <span className="chart-axis top">Cumulative de-identified records</span>
            <span className="chart-axis bottom">Jan 2024 - May 2025</span>
            <i /><strong>28,541<br /><span>May 2025</span></strong>
          </div>
        </section>
      </div>
      <section className="panel audit-panel" aria-labelledby="recent-audit-title">
        <PanelHeader eyebrow="Recent activity" title="Recent Security Events" badge="Append-only" />
        <ul className="audit-log">
          {auditEvents.slice(0, 8).map((event, i) => (
            <li key={`${event.time}-${i}`}>
              <strong>{event.time}</strong>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function DataSourcesTab() {
  return (
    <>
      <div className="governance-dashboard-grid">
        <section className="panel wide-panel" aria-labelledby="ingestion-title">
          <PanelHeader eyebrow="Data Ingestion" title="Recent Data Ingestion" badge="View all" />
          <table className="compact-table">
            <thead>
              <tr><th>Source Hospital</th><th>Data Type</th><th>Records</th><th>Ingested At</th><th>Status</th><th>Quality Score</th></tr>
            </thead>
            <tbody>
              {[
                ["Bangkok Neurology Hospital", "OCTA image", "142", "12 May 2025 14:20", "Completed", "0.87"],
                ["Chiang Mai Memory Hospital", "OCTA image", "416", "12 May 2025 11:05", "Completed", "0.93"],
                ["Siriraj Hospital",           "OCTA image", "311", "11 May 2025 19:22", "Completed", "0.88"],
                ["Bumrungrad Hospital",        "OCTA image",  "79", "10 May 2025 08:44", "Queued",    "0.78"],
                ["Phuket International",       "OCT 3D",      "58", "09 May 2025 16:12", "Processing","0.82"],
              ].map(([hospital, type, records, ingested, status, quality]) => (
                <tr key={`${hospital}-${records}`}>
                  <td>{hospital}</td><td>{type}</td><td>{records}</td><td>{ingested}</td>
                  <td><span className={`status-pill ${status !== "Completed" ? "pending" : ""}`}>{status}</span></td>
                  <td>{quality}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <section className="panel" aria-labelledby="scan-type-dist-title">
          <PanelHeader eyebrow="Scan type" title="Scan Volume by Type" badge="28,541 total" />
          <div className="donut-chart large scan-donut" aria-label="Scan type distribution"><strong>28,541</strong><span>Total</span></div>
          <div className="donut-legend compact">
            <span><i className="dot blue-dot" /> OCTA Macula 3×3 mm <strong>21,673</strong></span>
            <span><i className="dot purple-dot" /> OCTA Wide-field <strong>4,215</strong></span>
            <span><i className="dot amber-dot" /> OCT 3D <strong>2,653</strong></span>
          </div>
        </section>
      </div>
      <section className="panel" aria-labelledby="disease-dist-title">
        <PanelHeader eyebrow="Disease distribution" title="Cases by Disease Class (Labeled)" badge="Training set" />
        <table className="compact-table">
          <thead><tr><th>Disease</th><th>Cases</th><th>% of total</th><th>Scan type</th><th>Avg quality</th></tr></thead>
          <tbody>
            {[
              ["Alzheimer Risk",           "4,821", "25.7%", "OCTA",     "0.91"],
              ["Diabetic Retinopathy",      "3,902", "20.8%", "OCTA/OCT", "0.88"],
              ["Glaucoma",                 "3,156", "16.8%", "OCTA",     "0.90"],
              ["AMD",                      "2,813", "15.0%", "OCTA",     "0.87"],
              ["Hypertensive Retinopathy", "2,142", "11.4%", "OCT",      "0.85"],
              ["Pathologic Myopia",        "1,898", "10.1%", "OCTA",     "0.89"],
            ].map(([d, n, pct, scan, quality]) => (
              <tr key={d}><td>{d}</td><td>{n}</td><td>{pct}</td><td>{scan}</td><td>{quality}</td></tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function DeidentTab() {
  return (
    <>
      <div className="governance-dashboard-grid">
        <section className="panel" aria-labelledby="deid-flow-title">
          <PanelHeader eyebrow="De-identification Pipeline" title="PHI Removal Process" badge="Automated" />
          <div className="deid-flow">
            {["Raw Data Received", "PHI Detected", "Data Removed", "ID Replacement", "De-identified Data"].map((item) => (
              <span key={item}>{item}</span>
            ))}
          </div>
          <div className="phi-table">
            <span>Patient ID</span><strong>Hash-based random ID</strong>
            <span>Name</span><strong>Case ID replacement</strong>
            <span>Date of Birth</span><strong>Age group only</strong>
            <span>Phone / Email</span><strong>Removed entirely</strong>
            <span>Hospital ID</span><strong>Hospital code only</strong>
            <span>DICOM metadata</span><strong>Stripped to scan params</strong>
          </div>
        </section>
        <section className="panel wide-panel" aria-labelledby="deid-stats-title">
          <PanelHeader eyebrow="De-identification stats" title="PHI Removal Statistics" badge="This month" />
          <table className="compact-table">
            <thead><tr><th>Field</th><th>Records processed</th><th>Removed / replaced</th><th>Error rate</th><th>Method</th></tr></thead>
            <tbody>
              {[
                ["Patient ID",     "28,541", "28,541", "0.0%", "Hash-based UUID"],
                ["Name",           "28,541", "28,541", "0.0%", "Removed"],
                ["Date of Birth",  "28,541", "28,541", "0.1%", "Age group"],
                ["Phone",          "21,430", "21,430", "0.0%", "Removed"],
                ["Email",          "19,872", "19,872", "0.0%", "Removed"],
                ["DICOM metadata", "28,541", "28,541", "0.2%", "Tag stripping"],
              ].map(([field, processed, removed, error, method]) => (
                <tr key={field}><td>{field}</td><td>{processed}</td><td>{removed}</td><td>{error}</td><td>{method}</td></tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
      <section className="panel" aria-labelledby="compliance-title">
        <PanelHeader eyebrow="Compliance" title="Compliance Standards" badge="All passed" badgeTone="secure" />
        <div className="checklist">
          {[
            ["PDPA (Thailand)",      "All patient data de-identified before processing",                     "pass"],
            ["HIPAA Safe Harbor",    "18 HIPAA identifiers removed or generalized",                         "pass"],
            ["ISO 27001",            "Information security management controls applied",                     "pass"],
            ["GDPR Article 25",      "Privacy by design: minimum necessary data principle enforced",         "pass"],
            ["DICOM standard",       "Tag stripping aligned with DICOM PS3.15 Appendix E de-id profile",    "pass"],
          ].map(([standard, detail, state]) => (
            <div key={standard} className={`check-item ${state}`}>
              <strong>{standard}</strong>
              <span>{detail}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function ConsentTab() {
  return (
    <>
      <section className="panel" aria-labelledby="consent-summary-title">
        <PanelHeader eyebrow="Consent Management" title="Consent Status Overview" badge="All active cases" />
        <div className="metrics-grid">
          <article className="metric metric-blue"><span>Screening Consent</span><strong>98.4%</strong><small>Of active cases</small></article>
          <article className="metric metric-green"><span>Research Consent</span><strong>61.2%</strong><small>Optional — patient choice</small></article>
          <article className="metric metric-purple"><span>Model Training Consent</span><strong>43.7%</strong><small>Optional — patient choice</small></article>
          <article className="metric metric-orange"><span>Expired Consents</span><strong>47</strong><small>Renewal notification sent</small></article>
        </div>
      </section>
      <section className="panel" aria-labelledby="consent-table-title">
        <PanelHeader eyebrow="Consent records" title="Recent Consent Records" badge="Last 30 days" />
        <table className="compact-table">
          <thead><tr><th>Case ID</th><th>Screening</th><th>Research</th><th>Model Training</th><th>Expires</th><th>Status</th></tr></thead>
          <tbody>
            {[
              ["TE-2405-0187", "✓", "✓", "✗", "12 May 2026", "Active"],
              ["TE-2405-0182", "✓", "✗", "✗", "10 May 2026", "Active"],
              ["TE-2405-0179", "✓", "✓", "✓", "08 May 2026", "Active"],
              ["TE-2405-0176", "✓", "✗", "✗", "01 May 2026", "Active"],
              ["TE-2405-0195", "✓", "✓", "✗", "28 Apr 2026", "Active"],
              ["TE-2405-0198", "✓", "✓", "✓", "15 Mar 2026", "Active"],
              ["TE-2404-0154", "✓", "✗", "✗", "01 Feb 2026", "Expiring soon"],
              ["TE-2404-0148", "✓", "✓", "✓", "12 Dec 2025", "Expired"],
            ].map(([id, screen, research, training, expires, status]) => (
              <tr key={id}>
                <td>{id}</td><td>{screen}</td><td>{research}</td><td>{training}</td><td>{expires}</td>
                <td><span className={`status-pill ${status !== "Active" ? "pending" : ""}`}>{status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

function UsageLogTab({ auditEvents }: { auditEvents: AuditEvent[] }) {
  return (
    <>
      <div className="governance-dashboard-grid">
        <section className="panel" aria-labelledby="usage-stats-title">
          <PanelHeader eyebrow="Usage summary" title="Data Usage This Month" badge="May 2025" />
          <div className="usage-list">
            <UItem label="Total Analyses Performed" value="1,248" />
            <UItem label="Reports Generated" value="1,102" />
            <UItem label="Data Exported" value="24" />
            <UItem label="Research Access Events" value="7" />
            <UItem label="Model Retraining Runs" value="1" />
          </div>
        </section>
        <section className="panel" aria-labelledby="storage-title">
          <PanelHeader eyebrow="Storage" title="Storage & Infrastructure" badge="All systems operational" badgeTone="secure" />
          <div className="storage-gauge" style={{ "--gauge": "67%" } as CSSProperties}><strong>67%</strong><span>Used</span></div>
          <div className="usage-list">
            <UItem label="Used" value="1.34 TB" />
            <UItem label="Allocated" value="2.00 TB" />
            <UItem label="Raw scans (quarantine)" value="0.42 TB" />
            <UItem label="De-identified records" value="0.92 TB" />
          </div>
        </section>
        <section className="panel" aria-labelledby="training-overview-title">
          <PanelHeader eyebrow="Model Training" title="Training Overview" badge={clinicalModelVersion} badgeTone="secure" />
          <div className="training-overview">
            <strong>v4 (current)</strong>
            <span>AUC 0.923</span>
            <span>Accuracy 89.1%</span>
            <span>6 diseases</span>
            <span>12,492 images</span>
          </div>
          <div className="training-splits">
            <span><strong>Training</strong>18,732 images</span>
            <span><strong>Validation</strong>4,125 images</span>
            <span><strong>Test</strong>3,214 images</span>
          </div>
        </section>
      </div>
      <section className="panel audit-panel" aria-labelledby="full-audit-title">
        <PanelHeader eyebrow="Append-only audit log" title="Full Security Event Log" badge={`${auditEvents.length} events`} />
        <ul className="audit-log">
          {auditEvents.map((event, i) => (
            <li key={`${event.time}-${event.message}-${i}`}>
              <strong>{event.time}</strong>
              <span>{event.message}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function QItem({ label, value }: { label: string; value: string }) {
  return <div className="list-row"><span>{label}</span><strong>{value}</strong></div>;
}
function UItem({ label, value }: { label: string; value: string }) {
  return <div className="list-row"><span>{label}</span><strong>{value}</strong></div>;
}
