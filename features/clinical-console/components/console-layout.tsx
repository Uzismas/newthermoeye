"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { BarChart3, Database, FileText, Gauge, LayoutDashboard, ListChecks, FlaskConical, ScanEye, Settings, UploadCloud, Users, type LucideIcon } from "lucide-react";
import { clinicalModelVersion } from "../clinical-analysis";
import { navigationItems } from "../mock-data";
import type { SessionUser, ViewId } from "../types";

const navIcons: Record<ViewId, LucideIcon> = {
  dashboard: LayoutDashboard,
  tasks: ListChecks,
  demo: FlaskConical,
  cases: UploadCloud,
  patients: Users,
  analysis: ScanEye,
  report: FileText,
  insights: BarChart3,
  performance: Gauge,
  governance: Database,
  settings: Settings,
};

export function Sidebar({
  activeView,
  activeSubview,
  onSubviewClick,
}: {
  activeView: ViewId;
  activeSubview?: string;
  onSubviewClick?: (subview: string) => void;
}) {
  const subnav: Partial<Record<ViewId, { label: string; id: string }[]>> = {
    governance: [
      { label: "Data Overview", id: "data-overview" },
      { label: "Data Sources", id: "data-sources" },
      { label: "De-identification", id: "deidentification" },
      { label: "Consent Management", id: "consent" },
      { label: "Data Usage Log", id: "usage-log" },
    ],
    performance: [
      { label: "Overview", id: "overview" },
      { label: "Performance Metrics", id: "metrics" },
      { label: "Calibration", id: "calibration" },
      { label: "Error Analysis", id: "error-analysis" },
      { label: "Model Drift", id: "drift" },
      { label: "Version History", id: "version-history" },
    ],
  };
  const activeItem = navigationItems.find((item) => item.id === activeView) ?? navigationItems[0];
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Drawer only matters below 981px; on desktop the list is always visible via CSS.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setMenuOpen(false);
    const onPointer = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [menuOpen]);

  return (
    <aside className="side-nav" aria-label="Primary navigation">
      <Link className="brand" href="/console/dashboard" aria-label="Eyezheimer dashboard">
        <Image className="brand-mark" src="/eyezheimer-mark-white.png" alt="" width={257} height={149} priority />
        <span className="brand-text">
          <strong>Eyezheimer</strong>
          <small>OCTA vessel research</small>
        </span>
      </Link>

      <div className="workspace-menu" ref={menuRef} data-open={menuOpen ? "true" : "false"}>
        <button
          type="button"
          className="workspace-menu-trigger"
          aria-expanded={menuOpen}
          aria-controls="workspace-nav"
          aria-label={`${menuOpen ? "Close" : "Open"} menu, current view: ${activeItem.label}`}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="workspace-menu-hamburger" aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
          <span className="workspace-menu-label visually-hidden">{activeItem.label}</span>
        </button>
        <nav id="workspace-nav" className="nav-list" aria-label="Workspace views">
          {navigationItems.map((item) => {
            const isActive = activeView === item.id;
            return (
              <div className="nav-group" key={item.id}>
                <Link
                  className={`nav-item ${isActive ? "active" : ""}`}
                  href={`/console/${item.id}`}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMenuOpen(false)}
                >
                  <span className="nav-icon-wrap" aria-hidden="true">
                    {(() => { const Icon = navIcons[item.id]; return <Icon size={18} strokeWidth={1.8} />; })()}
                  </span>
                  {item.label}
                </Link>
                {isActive && subnav[item.id] ? (
                  <div className="subnav-list" aria-label={`${item.label} sections`}>
                    {subnav[item.id]?.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        className={activeSubview === sub.id ? "active" : ""}
                        onClick={() => {
                          setMenuOpen(false);
                          onSubviewClick?.(sub.id);
                        }}
                        aria-current={activeSubview === sub.id ? "true" : undefined}
                      >
                        {sub.label}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </nav>
      </div>

      <div className="pilot-status" aria-label="Pilot environment status">
        <p>AI Model Status</p>
        <span><i className="status-dot" />Research only</span>
        <small>{clinicalModelVersion}</small>
        <small>ONNX vessel U-Net · segmentation only · not clinically validated</small>
      </div>

      <Link className="help-link" href="/about">About &amp; help</Link>
    </aside>
  );
}

export function Topbar({
  onNavigate,
  onAuditExport,
  user,
  onLogout,
  demo,
  onToggleDemo,
}: {
  demo: boolean;
  onToggleDemo: () => void;
  onNavigate: (viewId: ViewId) => void;
  onAuditExport: () => void;
  user: SessionUser;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <div className="topbar-actions">
        <div className="topbar-context">
          <button className="icon-button notification-button" type="button" aria-label="Notifications">
            <span aria-hidden="true" />
          </button>
          <label className="hospital-picker">
            <span className="visually-hidden">Hospital</span>
            <select aria-label="Select hospital tenant" defaultValue="Bangkok Neurology Hospital">
              <option>Bangkok Neurology Hospital</option>
              <option>All Partner Hospitals</option>
              <option>Chiang Mai Memory Hospital</option>
              <option>Bangkok International Hospital</option>
            </select>
          </label>
          <div className="user-chip" role="group" aria-label="Signed in user">
            <span className="avatar" aria-hidden="true">{user.name.slice(0, 1)}</span>
            <strong>{user.name}</strong>
            <span>
              {user.role === "Doctor" ? "Neurologist" : user.hospital}
            </span>
          </div>
        </div>
        <div className="topbar-commands">
          <button className={`ghost-button compact-action demo-toggle ${demo ? "on" : ""}`} type="button" aria-pressed={demo} onClick={onToggleDemo}>
            Demo data: {demo ? "On" : "Off"}
          </button>
          <button className="ghost-button compact-action" type="button" onClick={onAuditExport}>
            Export audit
          </button>
          <button className="primary-button compact-action" type="button" onClick={() => onNavigate("cases")}>
            New scan
          </button>
          <button className="text-button compact-action" type="button" onClick={onLogout}>
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
