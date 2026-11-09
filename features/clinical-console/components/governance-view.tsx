"use client";

import type { AuditEvent } from "../types";
import { PanelHeader, SectionHeading } from "./shared";

const GOV_TABS = [
  { id: "data-overview", label: "Data Overview" }, { id: "data-sources", label: "Data Sources" },
  { id: "deidentification", label: "De-identification" }, { id: "consent", label: "Consent Management" },
  { id: "usage-log", label: "Data Usage Log" },
];

export function GovernanceView({ auditEvents, subview = "data-overview", onSubviewChange }: {
  auditEvents: AuditEvent[]; subview?: string; onSubviewChange?: (sub: string) => void;
}) {
  const details: Record<string, string> = {
    "data-overview": "This research workspace contains labelled synthetic fixtures and user uploads. Population counts, training split sizes, and quality rates are unavailable without a connected dataset registry.",
    "data-sources": "Source file and analysis provenance are recorded per case. Hospital ingestion totals and labelled disease distributions are unavailable.",
    deidentification: "De-identification verification is not connected. A case code does not prove that image pixels, filenames, or metadata are free of identifiers.",
    consent: "A consent registry is not connected. Consent status and usage authorizations are unavailable in this view.",
    "usage-log": "The events below are workspace activity records. They do not establish compliance certification or a tamper-proof audit archive.",
  };
  return <section className="view active" aria-labelledby="governance-title">
    <SectionHeading eyebrow="Research data workflow" title="Data Management" note="Unavailable controls and unverified status are shown explicitly." />
    <div className="tab-strip" role="tablist" aria-label="Data management sections">{GOV_TABS.map((tab) => <button key={tab.id} type="button" role="tab" aria-selected={subview === tab.id} className={subview === tab.id ? "active" : ""} onClick={() => onSubviewChange?.(tab.id)}>{tab.label}</button>)}</div>
    <section className="panel" role="tabpanel"><PanelHeader eyebrow="Connection status" title={GOV_TABS.find((tab) => tab.id === subview)?.label ?? "Data Overview"} badge="Research only" badgeTone="warning" /><p>{details[subview] ?? details["data-overview"]}</p></section>
    <div className="metrics-grid">{["Dataset registry", "Consent verification", "De-identification verification", "Clinical validation"].map((label) => <article className="metric metric-blue" key={label}><span>{label}</span><strong>N/A</strong><small>Not independently verified</small></article>)}</div>
    <section className="panel audit-panel"><PanelHeader eyebrow="Workspace activity" title="Recorded Events" badge={`${auditEvents.length} events`} /><ul className="audit-log">{auditEvents.map((event, i) => <li key={`${event.time}-${i}`}><strong>{event.time}</strong><span>{event.message}</span></li>)}</ul></section>
  </section>;
}
