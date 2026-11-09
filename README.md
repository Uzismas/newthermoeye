# Thermoeye

Thermoeye is a research-only OCTA vessel-segmentation workflow prototype. The
connected ONNX artifact measures vessel masks; it does not classify Alzheimer
disease, MCI, or another disease. Disease risk and confidence remain
indeterminate/null.

## Web Preview

The static preview is deployed from `web/` with GitHub Pages:

https://uzismas.github.io/thermoeye/

The Next.js application source lives in `app/` and `features/clinical-console/`.

## What changed in November 2026

- Sidebar navigation is visible on desktop again; tablet/phone use a menu button.
- New **Task Manager** view (`/console/tasks`) generated from each case's analysis status and review.
- Dashboard restored to the original layout; every number is computed from real case data.
- Self-hosted IBM Plex Sans Thai font (works offline). `/about` is a plain overview of scope and evidence.
- Model experiment and decision: `docs/MODEL_EXPERIMENT_2026-11-09.md`. Week plan: `docs/WEEK_PLAN_2026-11-13_TH.md`.

## Local Development

```bash
npm install
npm run dev
```

For local inference, start the backend in a second PowerShell terminal (the
local project venv and reviewed ONNX artifact must already be installed):

```powershell
Set-Location D:\Themoeye\project\teng1\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

Use Node 24 for the regression runner. With no backend/model available the
app returns unavailable measurements, not heuristic disease predictions.
Keep this demo on loopback: authentication is a prototype and case metadata is
lost at server restart. It is not a clinical or production patient-data system.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```

See [docs/ANALYSIS_CONTRACT.md](docs/ANALYSIS_CONTRACT.md) for the canonical
field contract and [docs/ENGINEERING_REPORT.md](docs/ENGINEERING_REPORT.md) for
the verified flow, test commands, example response, and limitations. The
static `web/` preview and older research reference assets are archival/demo
materials; the live implementation is the Next.js app.

For a shareable explanation of the end-to-end workflow, gates, outputs, and
production-readiness requirements, see
[docs/THERMOEYE_FLOWCHART_TH.md](docs/THERMOEYE_FLOWCHART_TH.md).
