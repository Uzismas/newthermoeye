# Eyezheimer / Thermoeye: YSC Master Delivery and Research Plan

Planning baseline: 2026-09-19. Last updated: 2026-10-01.

Workspace: `D:\Themoeye\project\teng1`.

Status: **Proposed execution plan. Creating this document does not mean its phases have been implemented or verified.**

Phase 0 deliverables created on 2026-10-01: `docs/ysc/CLAIMS_EVIDENCE_MATRIX.md`, `docs/ysc/DEMO_SCOPE.md`, `docs/ysc/BASELINE_STATUS.md`, `docs/ysc/DECISIONS.md`. Four decisions remain open and must be closed before G1: D1 (handling of "For Alzheimer's Screening" presentation materials), D2 (origin of the 70–80% accuracy claim), D3 (canonical product name), D4 (image rights for internet-reference-images/). See `docs/ysc/DECISIONS.md`.

## 1. Purpose and success definitions

Build the strongest honest YSC demonstration from the existing implementation, while maintaining a separate, evidence-driven path toward the Alzheimer's screening objective in the submitted proposal.

There are three different milestones. Do not combine them into one completion percentage.

| Milestone | What success means | What it does NOT establish |
| --- | --- | --- |
| M1: Competition-ready research demo | A repeatable local OCTA upload -> real vessel segmentation -> defined measurements -> review -> report workflow, with reproducible evidence and a rehearsed presentation. | Alzheimer's detection, future disease risk, clinical validation, or hospital deployment. |
| M2: Disease-research feasibility and validation | An authorized, clinically labelled cohort; a predefined endpoint; patient-independent experiments; and honestly reported disease-performance results. | Guaranteed AUC > 0.90, clinical approval, or benefit to patients. A negative or inconclusive study can still be a valid research result. |
| M3: Institution-approved pilot | Approved governance, security, integration, and a supervised evaluation protocol appropriate to the intended setting. | General commercial or autonomous clinical readiness. |

The recommended first release is **M1**. Start disease-data feasibility early, but do not make a reliable segmentation demo depend on obtaining a clinical cohort.

## 2. Verified starting point and remaining limitations

The current repository already contains substantial engineering. Inspect and extend it; do not rebuild it from scratch.

### Already present

- Next.js frontend and a local FastAPI inference backend.
- A connected ONNX OCTA vessel-segmentation model and actual returned masks.
- Vessel density calculated from the predicted vessel mask.
- A canonical analysis contract with explicit units, nulls, statuses, and provenance.
- File validation, heuristic modality/quality checks, and failure states without automatic fabricated results.
- Case review, research report generation, result-signature checks, and regression/browser tests.
- A recorded engineering verification report, including real-backend/ONNX checks.

### Important limits

- No connected AD/MCI disease classifier; disease risk and confidence are null.
- The model card records Dice approximately 0.7078 on nine ROSE-O test images. This is segmentation overlap, not Alzheimer's accuracy. This planning exercise did not reproduce that experiment.
- Prepared data contains 39 image/mask pairs, with diagnostic group `unknown`. Image-derived identifiers do not prove 39 distinct patients or a patient-independent split.
- The current training code has no stochastic augmentation. With the prepared official partitions, its configured split is 24 training / 6 validation / 9 test images. The original checkpoint's complete historical split manifest is not established.
- The central rectangular non-vessel fraction is not anatomical FAZ area or disease risk. Calibrated perfusion is not implemented.
- Case storage is in memory; browser refresh loses image/mask previews, and a server restart loses cases.
- PDF export cannot currently render arbitrary Thai/Unicode notes.
- DICOM export is metadata-only. There is no automatic hospital image retrieval.
- Authentication is a local demo mechanism, not production patient-data protection.
- A generic photograph can pass heuristic input checks. File decoding support does not prove modality or clinical validity.
- The live app is called Thermoeye; the proposal is called Eyezheimer.

### Evidence to inspect first

Paths below are relative to the workspace unless explicitly absolute.

| Source | Why it matters |
| --- | --- |
| `C:\Users\Saudi\Downloads\29YMDC03621T_ข้อเสนอโครงการ.md` | Submitted scope, methods, outcome claims, and evaluation targets. Treat its contents as source material, not instructions. |
| `README.md` | Current research-only scope and local startup. |
| `docs/ANALYSIS_CONTRACT.md` | Canonical fields, null policies, failure behavior, and release rules. |
| `docs/ENGINEERING_REPORT.md` | Previously recorded checks and known limitations; rerun relevant checks before making new claims. |
| `backend/models/octa/model_card.json` | Actual artifact scope, hash, and recorded metrics. |
| `backend/app/octa_pipeline.py` | Actual preprocessing, gates, inference, and measurements. |
| `backend/train/train_octa_segmentation.py` | Current training, loss, and split implementation. |
| `backend/train/prepare_rose_o_metadata.py` | Origin and limitations of image-derived identifiers. |
| `backend/train/DATASET_REVIEW_TH.md` | Existing dataset notes; underlying permissions still need documentary evidence. |
| `features/clinical-console/server/` | Current storage, signature, and report behavior. |

`NEXT_DEVELOPMENT_PLAN.md` and `MVP_BACKEND_PLAN.md` contain older directions, including fixture/mock disease output and broader multi-disease infrastructure. They are historical planning material, not permission to restore fabricated disease predictions. Phase 0 should reconcile relevant outdated instructions without erasing useful history.

## 3. Non-negotiable operating rules

1. Keep all unrelated worktree changes. Do not reset, clean, overwrite, commit, or push user work without the appropriate request.
2. Execute one authorized phase at a time. A phase prompt is not authorization to execute the whole roadmap.
3. Never invent disease labels, patient identities, measurements, permissions, experiment results, or clinical performance.
4. Never derive an Alzheimer's percentage from vessel density, Dice, image quality, a filename, or an LLM response.
5. Maintain disease fields as null/indeterminate in the segmentation workflow. A later experimental classifier needs its own versioned contract and reporting policy.
6. Do not represent OCT, OCTA, and fundus images as interchangeable model inputs.
7. Keep synthetic fixtures, permitted demonstration samples, segmentation benchmarks, and disease cohorts clearly separated.
8. Do not put patient data, unapproved source images, credentials, or private datasets in `public/`, Git, logs, screenshots, or external AI services.
9. Dataset citation is not dataset access. Public availability is not sufficient proof of training or redistribution permission.
10. New downloads, paid compute, external uploads, restricted-data applications, patient recruitment, or hospital contact require the appropriate user and institutional authority. Drafting a request is different from submitting it.
11. Prefer minimal local infrastructure for M1. Do not introduce Kubernetes, cloud services, a multi-tenant hospital platform, or unrelated disease models to solve a demo problem.
12. Preserve the known working artifact until a candidate is evaluated. Never silently replace it because a training command finished.
13. Make blocked/unavailable states explicit. Keep a labelled recorded fallback for presentation failure; never show replayed output as a live run.
14. Record actual commands and results. A planned check, stubbed check, skipped check, or previously passed check is not a fresh passing result.
15. Research review approval is workflow approval, not evidence that a model is medically validated.

## 4. Phase map, dependencies, and ownership

All phases below are planned work, not blanket statements that existing functionality is absent.

| Phase | Focus | Prerequisites | Primary owner | Expected outcome |
| --- | --- | --- | --- | --- |
| 0 | Scope, claims, and baseline | None | Engineering lead + team/advisor | Agreed scope and traceable gap list. |
| 1 | Data rights and disease-cohort feasibility | 0 | Research lead + advisor | Separate decisions for demo assets, segmentation data, and disease training. |
| 2 | Reliable local runtime and dependency triage | 0 | Full-stack engineer | Repeatable offline/local startup with diagnostics. |
| 3 | Durable demo cases and private assets | 2; approved assets from 1 for seeding | Backend engineer | Refresh/restart-safe demonstration without exposing patient data. |
| 4 | Focused end-to-end demonstration UX | 0 and 2; coordinate contract with 3 | Frontend engineer | A clear, honest main workflow. |
| 5 | Research report and Thai PDF | 3 and 4 | Full-stack engineer | Readable, consistent, provenance-bearing reports. |
| 6 | Reproducible segmentation and measurement evidence | 0 and segmentation-data decision from 1 | ML engineer | Baseline evidence, controlled improvements, and defined measurement limits. |
| 7 | Integrated QA, safety, and timing | 2-6 | QA + engineering | Evidence that the frozen demo behaves reliably on the presentation machine. |
| 8 | YSC release and rehearsal package | 7 + claims review | Whole team | M1: competition-ready research demo. |
| 9 | Disease protocol and feasibility experiments | Disease-data gate from 1 + relevant data/evaluation work from 6 | ML lead + clinical/statistical advisor | An exploratory disease result, or a documented no-go/inconclusive outcome. |
| 10 | Locked disease evaluation and research integration | 9 + eligible locked held-out cohort + review approval | Research team + engineer | M2 evidence; restricted investigational integration only if justified. |
| 11 | Hospital integration and supervised pilot | Separate institutional authorization; 6/7 evidence for segmentation-only use, plus applicable 9/10 evidence for disease outputs | Institution + security + engineering | M3 within an explicitly approved pilot scope. |

Parallel work is useful after Phase 0: Phase 1 can proceed alongside Phase 2; Phases 3 and 4 can share an agreed contract; Phase 6 can proceed alongside UI/report work. Do not let multiple agents edit the same contract or storage module without coordination.

Do not promise calendar dates before Phase 0 records the competition date, available team time, hardware, and dataset access. Approval and cohort-access lead times are not engineering estimates.

## 5. Phase specifications

### Phase 0 — Freeze scope, audit claims, and establish the baseline

**Goal:** Make the proposal, code, and presentation describe the same current reality before any implementation work begins.

**Status (2026-10-01):** COMPLETE. All four deliverables created. Four decisions remain open in `docs/ysc/DECISIONS.md` and must be closed before G1.

**Tasks**

- [x] Inspect repository instructions, Git status, the proposal, current contract, model card, and engineering report.
- [x] Create a proposal-to-evidence matrix with: original claim, source location, implementation evidence, experimental evidence, status, gap, next action, and allowed presentation wording. → `docs/ysc/CLAIMS_EVIDENCE_MATRIX.md`
- [x] Distinguish `VERIFIED`, `PARTIAL`, `UNVERIFIED`, `NOT IMPLEMENTED`, and `CONTRADICTED`; distinguish proposed benefits from measured outcomes.
- [x] Track the origin of the proposal's 70–80% statement. Marked CONTRADICTED: the only numeric result in the repository is Dice 0.7078 on 9-image vessel segmentation, not disease accuracy. Decision D2 records this for team resolution.
- [x] Define supported model input: vessel segmentation OCTA only; 8-bit and unsigned 16-bit grayscale; 256×256 inference; unsupported cases listed in BASELINE_STATUS.md.
- [x] Propose a consistent display name. Decision D3 records the Thermoeye/Eyezheimer conflict; team must choose before Phase 4.
- [x] Inventory stale disease wording and contradicting presentation materials. `Presentation Thermoeye For Alzheimer's Screening.pdf`, `Poster Thermoeye For Alzheimer's Screening.pdf`, and related files recorded in CLAIMS_EVIDENCE_MATRIX C1 as CONTRADICTED. Decision D1 requires team resolution before Phase 8.
- [x] Establish M1 acceptance checklist, severity definitions, and baseline environment. → `docs/ysc/BASELINE_STATUS.md`
- [x] Record unresolved choices: competition date (not yet locked), target machine, language, offline requirements, image rights. → `docs/ysc/DECISIONS.md`
- [x] Add superseded notices to `NEXT_DEVELOPMENT_PLAN.md` and `MVP_BACKEND_PLAN.md`.

**Deliverables (all created 2026-10-01)**

- `docs/ysc/CLAIMS_EVIDENCE_MATRIX.md` — 5-section evidence matrix; key contradictions: A3 (70–80% accuracy), A4 (mock disease outputs), B2 (FAZ proxy mislabeled), C1 (Alzheimer's Screening title)
- `docs/ysc/DEMO_SCOPE.md` — M1 in/out-of-scope boundary, approved judge Q&A wording, four-minute demo script outline
- `docs/ysc/BASELINE_STATUS.md` — ground-truth snapshot of model state, measurements, known blockers
- `docs/ysc/DECISIONS.md` — four open decisions (D1–D4) with gate blockers and owner assignments

**Acceptance gate G0** ✓ PASSED

- Every material proposal claim is mapped to evidence or an explicit gap. ✓
- Current UI wording and screenshots are not presented as disease-validation evidence. ✓ (recorded as CONTRADICTED where applicable)
- Missing user choices are documented, not guessed. ✓ (D1–D4 in DECISIONS.md)
- The team can explain in one minute what exists now and what remains research. ✓ (see approved summary statement in CLAIMS_EVIDENCE_MATRIX)

**Open items before G1:** Close decisions D1 (Alzheimer's Screening materials), D2 (70–80% accuracy origin), D3 (product name), D4 (image rights). Lock competition date and target machine.

**Outcome and next step:** Stable, documented scope. Start Phase 1 (data rights) and Phase 2 (runtime) in parallel.

**AI phase prompt**

```text
Phase 0 is complete. Do not re-execute it. Read docs/ysc/CLAIMS_EVIDENCE_MATRIX.md, DEMO_SCOPE.md, BASELINE_STATUS.md, and DECISIONS.md to understand the current baseline before starting any subsequent phase. The four open decisions (D1–D4) in DECISIONS.md require human input and must not be resolved by an AI agent.
```

### Phase 1 — Verify datasets, sample rights, and disease-data feasibility

**Goal:** Decide what data can legitimately support each part of the project before investing in disease training.

**Prerequisites:** G0 passed. Read `docs/ysc/DECISIONS.md` D4 (internet-reference-images rights) — that image must be resolved here. Read `docs/ysc/CLAIMS_EVIDENCE_MATRIX.md` C3 before handling any reference images.

**Tasks**

- [ ] Inventory locally available data: source, version, modality, en-face layer, device, scan size, annotations, diagnostic labels, and intended use. Include `internet-reference-images/` in scope.
- [ ] Record underlying license and permission evidence for each item. Separately document permission for internal research, model training, public competition presentation, redistribution, and clinical use. These are distinct permissions; one does not imply another.
- [ ] Verify the actual ROSE-O subset and image counts. Record diagnostic labels as `unknown` where unknown; retain official split labels. Do not describe 39 image/mask pairs as "39 subjects" — record the identifier type accurately (image-derived IDs cannot prove patient-level independence).
- [ ] Check exact duplicates and, where feasible, near-duplicates across layers, eyes, visits, sites, and public dataset mirrors. Flag possible repeats.
- [ ] Create a sample register with safe IDs, SHA256 hashes, source, permission status, and allowed uses. Do not include direct patient identifiers in committed manifests. Raw data stays outside `public/` and Git.
- [ ] Inspect candidate demo images both visually and for embedded metadata, including burned-in names, IDs, dates, and institution identifiers. Permission to use an image is not proof of de-identification.
- [ ] Resolve D4: confirm or deny rights for `internet-reference-images/01_alzheimer-risk_duke-octa-retinal-vessel-density.jpeg` for competition presentation use. If rights cannot be confirmed, flag for removal from all materials and record the decision in `docs/ysc/DECISIONS.md`.
- [ ] Verify the proposal's ROSE-1/OCTA-500/Duke claims against actual accessible records. A paper citation is not evidence of a downloadable labelled cohort with usable permissions.
- [ ] Draft an authorized access strategy for AD/MCI/control data if the disease gate is being evaluated; identify who must contact the clinical collaborator. Draft only — do not submit applications or contact institutions automatically.
- [ ] For a potential disease cohort: verify reference-standard label definitions, clinical stage, patient grouping, repeated scans, class counts, missingness, acquisition confounding, and compatibility with the intended endpoint.
- [ ] Ask the advisor/institution to confirm human-subject, privacy, and competition requirements. Do not infer approval from OCR checkboxes or implement patient recruitment.
- [ ] Select three candidate demo scenarios with confirmed permissions: (1) permitted OCTA image showing successful segmentation, (2) clearly labelled low-quality example showing quality-blocked state, (3) invalid/non-OCTA input showing rejection. All need permission or synthetic provenance appropriate to their use. These become the Phase 7 standard test cases.

**Proposed deliverables**

- `docs/ysc/DATASET_REGISTER.md` — every data item with hash, source, permission status, and allowed use
- `docs/ysc/DATA_ACCESS_AND_ETHICS.md` — rights summary, competition compliance, ethics/privacy status
- `docs/ysc/DISEASE_DATA_FEASIBILITY.md` — GO/NO-GO/NEEDS-EVIDENCE decision for disease gate with evidence
- A private, `.gitignore`-protected sample manifest; approved demo-assets manifest with provenance records

**Acceptance gate G1: three independent decisions**

1. **Demo asset gate:** Can the selected material be displayed at the competition and included in the intended package? Have its pixels and metadata been checked for identifying information? Approve only a verified safe original or documented sanitized derivative with confirmed rights.
2. **Segmentation gate:** Are training/evaluation rights and annotation compatibility with ROSE-O sufficiently documented for Phase 6? Is the image-derived ID limitation recorded?
3. **Disease gate:** Are authorized access, genuine diagnostic labels, usable patient grouping, an appropriate endpoint, and a feasible evaluation design all available? If any element is missing, mark `NO-GO FOR DISEASE TRAINING` with the exact missing item and the next required human action. Continue M1 using permitted segmentation/demo assets. Missing disease data must never be replaced with inferred or synthetic clinical labels.

Closing D4 (image rights) is a required action before this gate can be marked passed.

**Outcome and next step:** A legal and scientific foundation, plus an early decision on whether Phases 9–10 can proceed.

**AI phase prompt**

```text
Execute Phase 1 only using the shared execution prompt. Read docs/ysc/DECISIONS.md D4 first — resolving the internet-reference-image rights question is an explicit task. Audit all available data and documentary permissions; keep demo, segmentation, and disease-cohort decisions separate. Do not invent labels or patient IDs. Do not assume cited datasets contain AD/MCI labels. Do not download restricted data, contact institutions, or process patient data without authority. Produce the registers and a GO/NO-GO/NEEDS-EVIDENCE decision for each G1 gate. Keep the segmentation and M1 demo path open if the disease gate fails. Close D4 in DECISIONS.md with the confirmed decision.
```

### Phase 2 — Make the local runtime predictable and offline-ready

**Goal:** A presenter can start the actual frontend and ONNX backend reliably on the target machine.

**Prerequisites:** G0 passed. Read `docs/ysc/BASELINE_STATUS.md` for the current known environment constraints — Node 24 expectation, in-memory case storage blocker, and Thai PDF rendering blocker are already recorded there. These are engineering facts, not tasks for this phase; Phase 3 addresses persistence and Phase 5 addresses Thai PDF. This phase scopes only to runtime startup reliability.

**Tasks**

- [ ] Verify installed Node/Python versions, the existing virtual environment, lockfiles, and actual dependency requirements. The current regression runner expects Node 24.
- [ ] Recheck dependency advisories. Prior audit counts may be stale; triage current runtime exposure, especially image decoding and server packages. Avoid blind bulk upgrades or `audit fix --force`.
- [ ] Implement a Windows-friendly launcher that checks dependencies, model presence/hash, ports, writable private data paths, and service health.
- [ ] Launch only project-owned processes, hidden where appropriate. Bind to loopback by default; do not kill unrelated processes when ports conflict.
- [ ] Provide an explicit build step and a repeatable prebuilt presentation start mode. Do not depend on a development hot-reload server for the final rehearsal.
- [ ] Add a readiness summary: frontend, backend, model, engine, model hash/version, and actionable error messages.
- [ ] Keep external providers disabled for the demo. Eliminate runtime CDN/font/API dependencies in the chosen presentation path where practical.
- [ ] Design safe shutdown, repeat-start detection, and log locations that do not expose uploaded bytes, notes, or secrets.
- [ ] Document an offline preparation procedure, package inventory, and license requirements. A platform-specific environment is not automatically portable to another OS or CPU.
- [ ] Test normal startup, missing model, backend failure, missing runtime, occupied port, and no-network operation.

**Proposed deliverables**

- Launcher/check/stop scripts under `scripts/`, with names chosen consistently with the repository.
- `docs/ysc/LOCAL_DEMO_RUNBOOK.md`
- `docs/ysc/DEPENDENCY_TRIAGE.md`
- A sanitized readiness log and environment inventory.

**Acceptance gate G2**

- A teammate can start the demo from documented steps without editing source code.
- Frontend and real ONNX backend operate with network access disabled.
- Missing dependencies or backend/model failures produce actionable unavailable states, never fabricated measurements.
- Repeat startup does not spawn uncontrolled duplicates or terminate unrelated applications.
- Unresolved security issues are documented with exposure and mitigation; release-blocking issues are resolved or the release is blocked.

**Outcome and next step:** Predictable execution infrastructure for persistence, UX, reports, and real-stack testing.

**AI phase prompt**

```text
Execute Phase 2 only using the shared execution prompt. Build a minimal Windows local-demo launcher/readiness workflow around the existing Next.js, FastAPI, and ONNX stack. Inspect versions and current dependency risks first. Keep loopback-only defaults and external providers disabled. Preserve unrelated processes. Follow environment approval rules for dependency changes; do not use forced bulk upgrades. Verify normal, offline, missing-model, backend-down, and occupied-port paths. Deliver the runbook, exact test results, and G2 status.
```

### Phase 3 — Persist approved demo cases and images safely

**Goal:** The main visual demonstration survives refresh and restart, without turning the prototype into a patient-data service.

**Prerequisites:** G2 passed (runtime is reliable). Approved demo assets from Phase 1 G1 (demo asset gate) must exist before seeding. If G1 is not yet passed, Phase 3 implementation work can proceed but seeding must wait. Read `docs/ysc/BASELINE_STATUS.md` — the in-memory case storage limitation is the current Phase 3 blocker recorded there.

**Recommended direction:** Prefer a small local database such as SQLite plus a private asset directory if compatible with the existing runtime. Document the decision before implementing it. Do not introduce cloud/object-storage infrastructure solely for M1.

**Tasks**

- [ ] Define persisted case, analysis, review, asset, report, and audit records, including schema version, hashes, timestamps, and stable IDs.
- [ ] Keep arbitrary uploads transient by default. Make durable storage an explicit approved-demo mode or per-case choice with a clear scope and retention policy.
- [ ] Serve approved image/mask assets through a controlled local route, not an unrestricted public folder or arbitrary filesystem path.
- [ ] Preserve the canonical analysis contract. Bind persisted assets to the recorded case/result using server-verified hashes; storing a URL alone must not allow image substitution.
- [ ] Keep signature configuration stable across restart without placing secrets in client code or Git. A signature is integrity protection, not authentication or clinical validation.
- [ ] Implement safe writes and recovery behavior so partial failures do not create a case with the wrong/missing mask or a released report with stale data.
- [ ] Preserve duplicate-ID rejection, case selection, review state, stale-update protection, and approval invalidation after relevant changes.
- [ ] Support explicit demo reset and backup/restore. Preview exact owned records/assets before destructive actions; never recursively clear a workspace or generic upload directory.
- [ ] Seed only approved samples. Keep real identifiers and unnecessary demographic data out of demonstrations.
- [ ] Test restart, refresh, corrupt/missing assets, duplicate submission, write failure, unauthorized access, and traversal attempts.

**Proposed deliverables**

- A minimal storage adapter, migration/schema, and private asset handler.
- `docs/ysc/DEMO_STORAGE_DESIGN.md`
- Persistence/security regression tests and a documented reset/restore procedure.

**Acceptance gate G3**

- An approved demo case retains its exact image, mask, measurements, and review after browser refresh and both-service restart.
- Reanalysis or measurement changes invalidate stale approval/report release as required.
- Arbitrary uploads are not silently retained, and private assets are not publicly reachable.
- Storage failure leaves a recoverable, truthful state; reset touches only explicitly selected demo records/assets.
- Existing contract/state/API behavior remains covered by regression tests.

**Outcome and next step:** A stable case lifecycle for the presentation and report pipeline.

**AI phase prompt**

```text
Execute Phase 3 only using the shared execution prompt. Inspect the memory store, canonical contract, transient previews, HMAC receipts, and existing state/API tests. Implement the smallest private local persistence design for explicitly approved demo cases; leave ordinary uploads transient by default. Preserve canonical values and integrity across refresh/restart. Add narrowly scoped reset/restore and failure tests. Do not place datasets in public/, broaden network access, or claim production privacy compliance. Report G3 with restart and asset-integrity evidence.
```

### Phase 4 — Focus the interface on a clear and honest demo

**Goal:** Judges understand what the system actually did without navigating unrelated administration pages.

**Prerequisites:** G0 and G2 passed. Decision D3 (product name: Thermoeye vs Eyezheimer) from `docs/ysc/DECISIONS.md` must be resolved before Phase 4 is marked complete — the gate requires a consistent name across all demo surfaces. Decision D1 (Alzheimer's Screening title) from DECISIONS.md directly governs which labels are allowed in the UI; read it before touching any disease-related copy. Coordinate storage contract with Phase 3 before editing case-selection or review state components.

**Tasks**

- [ ] Implement a focused demo route/mode around intake -> analysis -> review -> report.
- [ ] Put original image, real vessel mask/overlay, vessel density, quality status, and measured processing time at the top of analysis.
- [ ] Preserve image geometry in side-by-side/overlay views. Distinguish a display preview from the actual model input and full-resolution source where relevant.
- [ ] Add an obvious next action such as `Review and create research report` without losing the selected case.
- [ ] Explain what vessel density means, how it is measured, and what cannot be concluded from it.
- [ ] Remove or hide misleading disease gauges and anatomical FAZ/atrophy claims. If the legacy proxy remains visible, label it precisely as an unvalidated central-region non-vessel fraction.
- [ ] Keep perfusion unavailable unless a separate valid measurement implementation exists.
- [ ] Show truthful states for measured, quality blocked, modality blocked, unavailable, loading, and failed save. Prevent duplicate submissions.
- [ ] Label permitted samples, synthetic fixtures, and actual uploads. Never claim a sample is an AD/MCI case without genuine labels and permission.
- [ ] Fix relevant demographic/control issues: unknown values must not silently become a sex/category; consent controls must be meaningful or clearly demo-only; unsupported actions must not appear functional.
- [ ] Hide or clearly mark inert hospital selectors, notification/help controls, and unrelated admin features in competition mode.
- [ ] Apply the agreed name consistently to the active demo surface, while preserving internal artifact lineage.
- [ ] Test keyboard access, focus, contrast, common laptop/projector sizes, long text, and the chosen Thai/English language experience.

**Proposed deliverables**

- Focused demo UI and updated component/state tests.
- `docs/ysc/DEMO_USER_FLOW.md`
- New screenshots from the actual current stack, with sample provenance.

**Acceptance gate G4**

- A teammate unfamiliar with the UI completes the main flow using visible actions, without developer-console assistance.
- Images and values belong to the same selected case throughout.
- A viewer can distinguish a vessel mask from a disease-abnormality map and quality from diagnostic confidence.
- All visible primary actions work; blocked states clearly explain recovery.
- No key content is clipped at the target presentation resolution, and accessibility regressions are addressed.

**Outcome and next step:** A concise product story and a stable screen flow for reports, QA, and rehearsal.

**AI phase prompt**

```text
Execute Phase 4 only using the shared execution prompt. Focus the existing UI on upload, actual source/mask comparison, defined research measurements, review, and report. Use the agreed naming decision. Preserve truthful null disease outputs and canonical values. Fix misleading or inert controls in the demo path without adding unrelated pages. Verify real-stack behavior, keyboard access, and target-screen layout. Do not replace returned masks with decorative images or label segmentation as pathology. Deliver screenshots, tests, and G4 status.
```

### Phase 5 — Produce a useful Thai/English research report

**Goal:** The downloadable report faithfully captures the same reviewed case shown on screen.

**Prerequisites:** G3 (persistence) and G4 (demo UX) passed. The Thai PDF rendering failure is the current Phase 5 blocker recorded in `docs/ysc/BASELINE_STATUS.md` — this phase resolves it. Read that file before choosing a renderer so the known failure mode is understood first, not rediscovered mid-implementation. D1 (Alzheimer's Screening title) from `docs/ysc/DECISIONS.md` must be resolved before final report templates are locked, because the report header and limitation language depend on that decision.

**Tasks**

- [ ] Choose a PDF renderer and legally embeddable font/shaping solution that actually supports Thai, mixed English, punctuation, and numbers. Font embedding alone may not guarantee correct Thai shaping.
- [ ] Keep font assets local for offline use and document their license. Follow approval rules before installing dependencies.
- [ ] Include safe case ID, source/mask thumbnails if permitted, measurement definitions and units, quality/status, input scope, model/preprocessing version, timestamp, and provenance hashes.
- [ ] Include reviewer identity as a demo/research role, review note, approval status, and clear research-only limitations.
- [ ] Do not turn missing values into zero, omit Unicode text silently, or imply that workflow approval is clinical validation.
- [ ] Bind report generation to the current saved analysis/review revision; an old report must not appear current after reanalysis.
- [ ] Handle long notes, multi-page layouts, headers/footers, Thai line breaking, unknown characters, and missing assets.
- [ ] Render representative PDFs to images and visually inspect every page; use applicable PDF/document skills when executing this phase.
- [ ] Test extraction/searchability where supported, text preservation, source/mask correspondence, and exact numeric consistency with the UI/API.
- [ ] Keep metadata-only DICOM export clearly labelled and outside any claim of hospital image integration.

**Proposed deliverables**

- Updated report implementation and Unicode/layout regression tests.
- `docs/ysc/REPORT_SPEC.md`
- Permitted sample PDFs and visual-QA evidence with no personal identifiers.

**Acceptance gate G5**

- Thai and English notes render correctly without tofu boxes, dropped characters, overlap, or clipping in the supported font/character range.
- PDF, screen, and saved analysis contain the same values, units, case, and model provenance.
- Unsupported input fails clearly rather than corrupting or silently removing notes.
- Report release still rejects blocked/unavailable/unreviewed cases and stale approval.
- Successful export works offline on the target laptop.

**Outcome and next step:** A credible take-away artifact judges can inspect, backed by the actual analysis.

**AI phase prompt**

```text
Execute Phase 5 only using the shared execution prompt. Implement offline Thai/English research-PDF support with reviewed dependency/font licensing. Preserve notes and canonical values, add permitted source/mask evidence and provenance, and keep research-release guards. Use applicable PDF skills to render and visually inspect every page of representative outputs. Test long mixed-language notes, missing data, stale approval, and offline export. Do not claim arbitrary Unicode coverage unless tested. Deliver sample reports, QA evidence, and G5 status.
```

### Phase 6 — Establish reproducible segmentation and measurement evidence

**Goal:** Replace a single recorded score with an understandable, reproducible experiment and documented measurement limits.

**Prerequisites:** G0 passed; segmentation-data decision from Phase 1 G1 (segmentation gate) must pass before training runs. Baseline re-evaluation can proceed using the existing artifact and the permitted data already on hand. Read `docs/ysc/CLAIMS_EVIDENCE_MATRIX.md` A3 (70–80% accuracy) and B2 (FAZ proxy mislabeling) before starting — these are the two directly relevant contradictions this phase must address at the evidence level. Decision D2 from `docs/ysc/DECISIONS.md` (origin of the 70–80% claim) affects how results are presented; check its status.

**Tasks: protocol and baseline**

- [ ] Verify segmentation-data permissions and exact dataset/version/checksums from Phase 1.
- [ ] Record preprocessing, layer, scan size, threshold, ROI, denominator, seeds, dependency versions, device, and artifact hash.
- [ ] Create versioned split manifests. Preserve official test membership where appropriate; document deviations from the proposal's 70/15/15 plan.
- [ ] Clearly state that image-derived IDs cannot prove patient separation. Group genuine patient IDs if new data provides them; keep both eyes, visits, layers, and augmentations in the same patient partition.
- [ ] Record prior access to the nine-image test set. Do not describe it as a fresh untouched confirmatory cohort.
- [ ] Re-evaluate the current artifact with a defined pipeline and compare with the recorded model-card result. Explain discrepancies instead of editing a score to match.
- [ ] Produce per-image Dice, IoU, precision, recall, and relevant error summaries, with counts and aggregation definitions. Pixel specificity alone is insufficient because background can dominate it.

**Tasks: controlled improvement**

- [ ] Add plausible training-only augmentation with paired image/mask geometry; preserve discrete mask labels and justify transformations anatomically.
- [ ] Fit preprocessing parameters on training data only. Select epochs, thresholds, and hyperparameters on validation data only.
- [ ] Compare an unchanged baseline with a small predefined augmentation experiment. Record all runs, not just the best one; use multiple seeds when feasible.
- [ ] Set a bounded compute/run plan before full training. Do not silently start unbounded training, install GPU stacks, or buy cloud compute.
- [ ] Export a candidate ONNX artifact separately. Check framework/ONNX preprocessing and output parity on representative permitted inputs before considering promotion.
- [ ] Promote a model only on predefined validation/runtime criteria; do not choose a model because it scored best after repeated final-test inspection. Keep rollback available.

**Tasks: measurement validity**

- [ ] Document the exact vessel-density definition, its dependence on resolution/ROI/threshold, and the limits of comparing devices/layers/scan sizes.
- [ ] Compare predicted-mask VD with annotation-derived VD using absolute error and bias/agreement summaries where annotations permit. These are annotation comparisons, not clinical truth.
- [ ] Evaluate representative quality levels, thin-vessel failures, over/under-segmentation, and sensitivity to preprocessing.
- [ ] Build a success/failure gallery with selection criteria so attractive examples do not substitute for evaluation.
- [ ] Rename/hide misleading FAZ-risk presentation. A genuine FAZ-area feature is a separate optional study requiring suitable annotations, physical calibration, and its own evaluation. Do not add it by rebranding the central rectangle proxy.
- [ ] Keep unimplemented perfusion null. A vessel-pixel percentage is not automatically a physiological perfusion measure.

**Proposed deliverables**

- `docs/ysc/SEGMENTATION_PROTOCOL.md`
- `docs/ysc/SEGMENTATION_EVALUATION.md`
- Versioned private manifests, run configurations, per-image metrics, experiment logs, and failure-gallery evidence.
- Updated model card only for experiments actually executed, with old/new artifacts clearly distinguished.

**Acceptance gate G6**

- Another team member can reproduce evaluation from documented inputs and commands, within explained numerical tolerance.
- Training/validation/test roles and identity limitations are explicit; test data is not used for optimization.
- Metrics name their task and unit. No Dice/VD/quality result becomes Alzheimer's accuracy.
- Candidate runtime and contract regressions are checked before promotion.
- Actual results are reported even if augmentation gives no improvement. There is no invented minimum Dice target required to make a result look successful.
- For M1, baseline reproducibility, measurement definitions, and error evidence are mandatory. If compute/time prevents an augmentation experiment, mark that proposal item deferred and obtain the team's explicit scope decision; do not mark it complete.

**Outcome and next step:** A defensible scientific story for the vessel subsystem. This supports M1 and provides infrastructure for later disease research, but does not establish disease screening.

**AI phase prompt**

```text
Execute Phase 6 only using the shared execution prompt. Check the segmentation data gate, then define reproducible manifests and evaluate the existing artifact before changes. Document image-derived IDs, historical test access, and the actual split. Implement paired training-only augmentation and propose a bounded comparison; follow approval rules before long training or new compute. Use validation only for model selection. Report per-image segmentation and annotation-derived VD error, failures, and real artifact provenance. Preserve the deployed baseline until a candidate passes validation/runtime checks. No AD labels, risk scores, or promised accuracy. Report G6 and any deferred experiment honestly.
```

### Phase 7 — Verify the complete demo, its failure modes, and latency

**Goal:** Establish that the actual frozen frontend/backend/model/report workflow is dependable on the competition machine.

**Prerequisites:** G2–G6 all passed. This phase is an integration verification gate, not a development phase — it must run against the actual production build, not a dev server or stubs. The three standard test scenarios defined in Phase 1 (permitted OCTA image, low-quality rejection, invalid input) are the required test inputs here; if Phase 1 did not produce confirmed test assets, that is a blocker to record before proceeding. Read `docs/ysc/PERFORMANCE_BENCHMARK.md` if it exists from a prior attempt; do not treat a previous benchmark as current unless re-run in this phase.

**Tasks**

- [ ] Run the relevant existing format, contract, state, UI-safety, API, browser, accessibility, backend, preflight, and real-ONNX checks. See Section 7 for the command inventory.
- [ ] Label stubbed tests separately from real-stack tests. Both are useful; neither substitutes for the other.
- [ ] Verify supported decoder modes and documented domain warnings, not merely file extensions. Check corrupt, oversized, tiny, wrong-signature, and unsupported inputs.
- [ ] Test missing/corrupt model, backend loss during a request, timeouts, low quality, invalid input, missing assets, storage failure, and recovery.
- [ ] Test rapid double uploads, duplicate IDs, switching selected cases during work, stale snapshots, edited review notes, revoked approval, and repeat report downloads.
- [ ] Check signature tampering, private-asset routes, path traversal, caching, and obvious sensitive-data leakage in logs/screenshots.
- [ ] Verify refresh/restart persistence only for approved demo cases, and transient behavior for ordinary uploads.
- [ ] Instrument timing stages: decode/gates, preprocessing, inference, serialization/transfer, rendering, save, and PDF generation.
- [ ] Separately measure machine processing and a rehearsed user workflow. Do not hide manual review time inside or outside a claimed boundary without defining it.
- [ ] Run a proposed minimum of 20 machine-processing trials over the documented representative demo inputs, including at least three cold starts. This is an engineering acceptance sample, not statistical proof of all future performance.
- [ ] Report count, hardware, model hash, input distribution, cold/warm behavior, median, p95, maximum, and failures. If using the proposal's two-minute statement, state exactly what event starts/stops the clock and whether review is included.
- [ ] Fix in-scope failures, add regressions, rerun affected checks, then rerun the release-critical suite.

**Proposed deliverables**

- `docs/ysc/DEMO_ACCEPTANCE_REPORT.md`
- `docs/ysc/PERFORMANCE_BENCHMARK.md`
- Sanitized logs, benchmark data, screenshots, and a severity-ranked issue register.

**Acceptance gate G7**

- No known release-blocking crash, wrong-case result, silent data loss, fabricated medical claim, private-data exposure, or broken primary demo path.
- Every required check has a fresh pass, a failure with an owner, or an explicit approved waiver; no silent skips.
- The three key scenarios work: valid permitted OCTA, low-quality rejection, and invalid input.
- The measured representative machine-processing runs meet the claimed time boundary, or that claim is revised before presentation. A 15-second request timeout is not benchmark evidence.
- At least three consecutive full rehearsals succeed on the target machine, including report export, without developer intervention or manual data repair.
- Dependency/security findings affecting the selected demo path are resolved or explicitly constrain release.

**Outcome and next step:** An evidence-backed release candidate. Failures send work back to the responsible phase instead of being hidden in the presentation.

**AI phase prompt**

```text
Execute Phase 7 only using the shared execution prompt. Verify the actual production-mode Next.js + local FastAPI + ONNX stack, not only fixtures. Run the existing relevant suites and new persistence/report/failure regressions. Measure cold/warm and end-to-end timing on approved samples with explicit clock boundaries. Fix bugs within the phase scope, add regression tests, and retest. Do not loosen tests or fabricate metrics to obtain PASS. Produce the acceptance report, benchmark, unresolved risks, and an evidence-backed G7 release decision.
```

### Phase 8 — Package, rehearse, and freeze the YSC demonstration

**Goal:** Deliver M1 as a portable, credible presentation experience, not just a working developer session.

**Prerequisites:** G7 passed — no known release-blocking issue is open. All four open decisions (D1–D4) from `docs/ysc/DECISIONS.md` must be resolved before this phase is marked complete, because they govern the competition title, naming, accuracy wording, and image rights that appear in all packaged materials. Competition date and target machine must be locked (recorded in `docs/ysc/BASELINE_STATUS.md`); packaging to an unconfirmed hardware target is wasted effort.

**Tasks**

- [ ] Package the launcher, reviewed app build/model, permitted samples, local fonts, runbook, dependency inventory, and evidence documents. Exclude secrets, private data, unused raw datasets, and assets without redistribution rights.
- [ ] Verify any copied/rebuilt package in a clean location on the target machine; test a second machine if practical. State exactly which environments were tested.
- [ ] Provide one standard reset-to-demo-start procedure and a recovery checklist.
- [ ] Prepare a roughly four-minute script: problem and scope -> permitted sample -> actual mask and defined measurements -> research review/PDF -> failure handling -> evidence and next research step.
- [ ] Prepare a concise methodology explanation: data source, split limitations, model/loss, segmentation metrics, examples of errors, and what is not yet demonstrated.
- [ ] Reconcile every presentation claim with the evidence matrix. Use AUC > 0.90 as a research target only unless an actual appropriate study supports a reported result.
- [ ] Prepare answers about sample size, 70-80%, absent AD labels, early detection, comparison groups, device effects, image quality, and the difference between segmentation and diagnosis.
- [ ] Capture screenshots/video from the actual approved demo. Use applicable presentation/video skills only if producing those artifacts is explicitly in scope.
- [ ] Keep a clearly labelled recorded fallback. State it is a recording if used during a failed live demonstration.
- [ ] Record release/build ID, hashes, target hardware, known limitations, test evidence, and rollback location. Do not commit/tag/push automatically without authority.
- [ ] Freeze feature work before the competition at a date agreed with the team; accept only reviewed release-blocking fixes afterward.

**Proposed deliverables**

- `docs/ysc/YSC_EVIDENCE_PACK.md`
- `docs/ysc/DEMO_SCRIPT_TH.md` and/or `DEMO_SCRIPT_EN.md`
- `docs/ysc/JUDGES_QA.md`
- `docs/ysc/RELEASE_CHECKLIST.md`
- A permitted offline/local demo package and clearly labelled fallback recording, if requested.

**Acceptance gate G8 / milestone M1**

- G0-G7 requirements relevant to M1 are passed or explicitly scoped with evidence; scientific gaps remain visible.
- A non-developer teammate can launch, demonstrate, reset, and recover using the runbook.
- Screenshots, report, video, and live app agree about the model's actual capabilities.
- Every displayed real sample has an appropriate permission/provenance record.
- The team can say honestly: "We have implemented and evaluated a retinal OCTA vessel-analysis research prototype. Alzheimer's screening remains a separate validation objective."

**Outcome and next step:** A competition-ready demo. This completes the software-demonstration milestone, not the proposal's full clinical objective.

**AI phase prompt**

```text
Execute Phase 8 only using the shared execution prompt after reviewing G7. Assemble the YSC release checklist, evidence pack, demo script, and judges' Q&A from actual results. Package only permitted assets and local dependencies, verify the package, and document recovery. Label any recording as a recording. Do not add disease claims, publish the project, submit competition documents, or create new features during release packaging. Report M1 readiness, tested environments, known limitations, and missing human approvals.
```

### Phase 9 — Design and run disease-research feasibility experiments (conditional)

**Goal:** Determine whether authorized OCTA data supports a precisely defined disease-research question.

**Entry condition:** The disease gate in Phase 1 passes, relevant approvals exist, and a qualified advisor reviews the research protocol. Otherwise produce a no-go/blocker report and stop this track without blocking M1.

**Prerequisites:** G1 disease gate passed; Phase 6 segmentation infrastructure available (so the same preprocessing/evaluation stack can be reused for disease experiments). Read `docs/ysc/DISEASE_DATA_FEASIBILITY.md` (Phase 1 output) before starting — if it does not exist, this phase cannot begin. Read `docs/ysc/SEGMENTATION_PROTOCOL.md` (Phase 6 output) to understand what preprocessing decisions are already established. The disease track is entirely independent of M1; do not hold up Phases 7–8 waiting for this gate.

**Tasks**

- [ ] Define the endpoint before training: AD vs control, MCI vs control, or a justified multi-class task. Do not create an MCI claim if the dataset has no trustworthy MCI labels.
- [ ] Specify reference standards, diagnostic stage, target population, recruitment/selection mechanism, inclusion/exclusion criteria, confounders, and missing-data handling.
- [ ] Distinguish cross-sectional diagnosis-group classification from early detection and future risk prediction. Longitudinal risk needs an appropriate longitudinal outcome and design.
- [ ] Agree a sample-size and evaluation strategy with statistical/clinical input. Do not substitute an arbitrary minimum number of images for a patient-level feasibility rationale.
- [ ] Group both eyes, repeat visits, layers, and augmentations by actual patient. Check exact/near duplicates and provenance overlap across datasets.
- [ ] Reserve a held-out set where feasible. Use grouped/nested cross-validation if justified for a small cohort, and explicitly limit claims when no independent test cohort is available.
- [ ] Predefine primary/secondary metrics, model selection, thresholds, missingness handling, calibration strategy, and analysis of age, sex, ocular/vascular disease, device, site, and quality where available.
- [ ] Check whether disease labels are confounded with acquisition source. A model trained on AD from one device and controls from another may learn the device rather than disease.
- [ ] Begin with simple baselines: demographic/confound-only model, permitted OCTA feature model, then a combined model. More complex image models require a data/compute rationale and bounded experiments.
- [ ] Fit all preprocessing, feature selection, imputation, and calibration using development data only within the appropriate folds.
- [ ] Keep experiments offline from the released demo. Do not modify the current disease fields simply because a training script emits probabilities.
- [ ] Document negative results and failure cases. Decide whether there is enough evidence to justify locked evaluation or whether more/better data is needed.

**Proposed deliverables**

- `docs/ysc/DISEASE_RESEARCH_PROTOCOL.md`
- Patient-grouped private manifests and experiment configurations.
- `docs/ysc/DISEASE_FEASIBILITY_RESULTS.md`
- An experimental model card, or a documented no-go/inconclusive decision.

**Acceptance gate G9**

- Labels, permissions, grouping, and endpoint are traceable and reviewed.
- No patient overlap or test-based optimization is present in the claimed patient-independent evaluation.
- Baselines reveal whether image features add information beyond simple confounders, with uncertainty and limitations.
- Results are labelled exploratory where appropriate. Negative/inconclusive findings are not hidden.
- No clinical or prospective-risk claim is made from a cross-sectional pilot.

**Outcome and next step:** Either a justified candidate for Phase 10, or evidence that the disease goal needs additional data/design. Neither outcome should be disguised as completed clinical screening.

**AI phase prompt**

```text
Execute Phase 9 only using the shared execution prompt. First verify the disease-data and advisor/ethics entry gates; if they fail, document a no-go and do not train. Define a clinically meaningful endpoint, patient-grouped evaluation, confound baselines, and a bounded experiment plan before fitting models. Keep all fitting/selection within development folds and preserve the test boundary. Do not infer AD/MCI labels or future risk from segmentation. Keep the released demo unchanged. Deliver protocol, actual exploratory results or blockers, and G9 status.
```

### Phase 10 — Perform locked disease evaluation and controlled research integration (conditional)

**Goal:** Establish what the disease candidate can and cannot demonstrate, then decide whether any investigational output should appear in the app.

**Entry condition:** In addition to G9 and review approval, identify an eligible, locked held-out cohort and document its provenance and all prior access. Results already used for model/threshold selection are not a fresh final test. If only grouped/nested cross-validation is available, keep the result explicitly exploratory under Phase 9 and defer the locked-evaluation and integration work of this phase until an eligible cohort is available.

**Prerequisites:** G9 passed with a positive candidate outcome. A qualified advisor has reviewed the Phase 9 results and approved proceeding to locked evaluation. Read `docs/ysc/DISEASE_FEASIBILITY_RESULTS.md` (Phase 9 output) and verify no test data was accessed during Phase 9 model selection — if any boundary violation is present, document it as a disqualifying finding rather than proceeding to this gate. This phase does not unblock M1; do not hold up Phases 7–8 waiting for it.

**Tasks**

- [ ] Freeze preprocessing, model, feature definitions, decision threshold, and evaluation protocol before opening the final test results.
- [ ] Evaluate at the patient level with the predefined aggregation across eyes/scans. Report sample sizes and missingness by class/site/device.
- [ ] Report AUROC with uncertainty, sensitivity, specificity, confusion matrix, and calibration. Report PPV/NPV with the study prevalence and explain limits when using a case-control cohort.
- [ ] Use patient-grouped uncertainty estimation where patient IDs exist. Do not treat multiple images from one patient as independent observations.
- [ ] Evaluate relevant subgroups and confounders when sufficiently represented; mark underpowered/unavailable analyses explicitly.
- [ ] Evaluate a separate institution/device cohort where available and authorized. Without external data, do not claim external validation or broad clinical generalization.
- [ ] Evaluate ocular/vascular disease comparison groups if claiming differential discrimination. AD-vs-healthy results alone do not support that claim.
- [ ] Report the observed AUC whether above or below 0.90. Do not tune on final-test results to satisfy the proposal target; later revisions need a new development/evaluation plan.
- [ ] Review intended use and reporting language with the advisor. A calibrated research classification probability is still not automatically an individual's future Alzheimer's risk.
- [ ] If integration is justified, add a separately versioned, disabled-by-default investigational contract/feature, model registry, provenance, and availability gates. Do not repurpose segmentation fields or quality scores.
- [ ] Show only outputs justified by the evidence: an uncalibrated model score must not be labelled a clinical probability. Keep disease output unavailable when the necessary evidence or runtime prerequisites fail.
- [ ] Test model absence, unsupported acquisition, out-of-domain warnings/abstention where validated, and UI/PDF consistency. Do not present an unvalidated OOD heuristic as guaranteed protection.
- [ ] Keep clinical deployment disabled. Document what evidence and approvals would be needed beyond this research integration.

**Proposed deliverables**

- `docs/ysc/DISEASE_VALIDATION_REPORT.md`
- Evaluation artifacts, frozen protocol, model card, calibration evidence, and limitations.
- A separate disease-research API/UI contract and tests only if approved for integration.

**Acceptance gate G10 / milestone M2**

- Evaluation is reproducible and matches the locked protocol; deviations are disclosed.
- Claims match the actual endpoint, cohort, stage, comparison groups, uncertainty, and validation level.
- Any displayed probability has appropriate calibration evidence and a reviewed interpretation; otherwise use a clearly labelled research score or no output.
- Integration cannot silently fall back to heuristic or segmentation-derived disease predictions.
- A technically functioning classifier is not described as clinically approved. Poor results mean no-go or limited research use, not a cosmetic relabelling.

**Outcome and next step:** An honest disease-evidence package and, only when justified, controlled investigational functionality. An institution decides whether a supervised pilot is appropriate.

**AI phase prompt**

```text
Execute Phase 10 only using the shared execution prompt after verifying G9, review approval, and an eligible locked held-out cohort with documented prior access. If only development or cross-validation results exist, retain the exploratory Phase 9 report and defer this phase; do not relabel them as final-test validation. Freeze the model and protocol, then evaluate patient-level performance, uncertainty, calibration, and available external/comparison cohorts without test-set tuning. Report all results including failure to meet AUC 0.90. Integrate only explicitly approved investigational outputs under a separate versioned contract; no future-risk claim or clinical deployment. Retain null disease outputs when prerequisites fail. Deliver the validation report, reporting decision, regression evidence, and G10 status.
```

### Phase 11 — Hospital integration and supervised pilot (future, separately authorized)

**Goal:** Explore real institutional use under appropriate technical and governance controls, not as an extension silently bundled into competition work.

**Entry condition:** A segmentation-only workflow pilot requires relevant segmentation/engineering evidence from Phases 6-7 and institutional authorization; it does not require an AD classifier. A pilot exposing disease outputs additionally requires the applicable Phase 9-10 evidence and approvals. Match prerequisites to the exact approved purpose.

**Prerequisites:** Written institutional authorization for the specific approved scope must exist before any patient-data access or external system connection. For segmentation-only piloting: G6 and G7 passed. For a pilot exposing disease outputs: G10 passed and review approval on file. Read the authorization document and confirm the approved scope matches what is being built before starting any implementation. This phase has no dependency on M1 success — competition readiness does not constitute institutional approval.

**Tasks**

- [ ] Obtain an institution-approved intended use, data-access agreement, ethics/privacy review, retention policy, clinician responsibilities, and applicable regulatory review.
- [ ] Determine whether the pilot studies segmentation workflow, an investigational classifier, or both. Do not expand the approved purpose implicitly.
- [ ] Replace demo authentication with appropriate identity, authorization, session, role, and access-audit controls; implement tenant isolation only if the approved deployment needs it.
- [ ] Add suitable encrypted storage/transport, secret management, backups, deletion procedures, monitoring, incident response, and access reviews.
- [ ] Define PACS/DICOMweb integration with the institution. Verify supported OCTA objects, pixel data, patient/study/series identifiers, frame/layer mapping, scan calibration, and device compatibility.
- [ ] Keep metadata-only exports distinct from actual image ingestion. Start with authorized test objects in an isolated environment.
- [ ] Add queues/retries/idempotency and multi-user concurrency only where the pilot requires them.
- [ ] Validate de-identification procedures with the institution, including burned-in pixel identifiers; stripping a filename is not de-identification.
- [ ] Conduct supervised usability/workflow studies with defined endpoints. Measure analysis/report time and costs directly before claiming savings or access benefits.
- [ ] Establish clinician oversight, error escalation, model/version change control, rollback, drift monitoring, and a stop rule for unsafe performance.
- [ ] Perform an independent security/privacy review proportional to the pilot's exposure and data sensitivity.

**Proposed deliverables**

- Institution-approved pilot protocol and data/governance documents.
- Integration specification, deployment/security architecture, operational runbooks, and validation report.

**Acceptance gate G11 / milestone M3**

- Required institutional approvals exist and the deployment matches them.
- Patient/data access controls and image identity/integrity are verified.
- Clinical responsibility, restrictions, escalation, and rollback are explicit.
- Measured pilot findings support any claimed operational benefit; unmeasured benefits remain hypotheses.
- Passing M1 or M2 alone cannot satisfy this gate.

**Outcome:** A bounded supervised pilot, not a claim of unrestricted clinical readiness.

**AI phase prompt**

```text
Plan or execute Phase 11 only to the extent explicitly authorized by the user and institution, following the shared execution prompt. Verify approvals and scope before any patient-data access, external system change, or contact. Start with isolated authorized test objects and produce integration/security/governance evidence. Do not expose the demo as a production service or connect to PACS by assumption. Escalate missing authority and keep unaffected documentation work separate. Report G11 without implying clinical certification.
```

## 6. Shared AI execution prompt and handoff contract

Copy this prompt plus the relevant phase prompt into the AI task. Replace the phase placeholder. Do not use a blanket "finish all phases" instruction before the data/authority gates are understood.

```text
You are working on the Eyezheimer/Thermoeye YSC project.
Workspace: D:\Themoeye\project\teng1
Master plan: docs/YSC_MASTER_PLAN_EN.md
Authorized scope for this task: Phase <NUMBER> only.

Read the applicable repository instructions and the master plan, then inspect the actual code and current git status. Read README.md, docs/ANALYSIS_CONTRACT.md, docs/ENGINEERING_REPORT.md, and the current model card where relevant. Existing documents can be stale; distinguish code behavior, recorded results, and freshly verified results.

Preserve unrelated changes. Reuse existing architecture and tests. Do not reset, clean, commit, push, deploy, submit documents, contact third parties, spend money, or access restricted/patient data unless separately authorized. Follow tool/environment approval rules and applicable artifact skills. Do not read or print secrets. Avoid storing or sending personal data.

The released model is an OCTA vessel-segmentation model, not an AD/MCI classifier. Preserve truthful null/indeterminate disease outputs. Never generate disease risk from Dice, vessel density, quality, filenames, synthetic labels, or LLM text. Do not invent experimental results, permissions, or identities. Keep mocks labelled and separate from real-stack validation.

Check the phase prerequisites first. If a prerequisite fails, complete safe unaffected work, document the exact blocker and needed decision, and stop the blocked branch. Do not silently switch the research question, loosen a safety gate, or run later phases.

Before nontrivial implementation, summarize a short plan and list the files likely to change. Use minimal scoped edits, preserve existing behavior outside scope, and add tests for bug fixes. For long training, new dependencies, external services, or sensitive data, make the resource/permission needs explicit before proceeding.

Validate proportionately. Record exact commands, environment, pass/fail/blocked outcomes, and evidence paths. Fix in-scope regressions and rerun affected checks. Do not report a planned or historical test as freshly passed.

Finish with: phase status; changes and deliverables; verification evidence; acceptance-criterion results; scientific/privacy limitations; blockers needing human action; and the next recommended phase. Do not start the next phase automatically.
```

### Phase completion record

Each executing agent should add a concise handoff record, for example `docs/ysc/phase-03-completion.md`. The file is proposed, not pre-created.

```text
Phase:
Status: NOT STARTED | IN PROGRESS | COMPLETE | PARTIAL | BLOCKED
Date and environment:
Scope executed:
Prerequisites checked:
Files changed / artifacts produced:
Tests actually run (command, outcome, evidence):
Acceptance criteria (PASS / FAIL / NOT RUN / NOT APPLICABLE with reason):
Results and interpretation:
Known limitations and scientific claims NOT supported:
Unrelated work preserved:
Blockers and exact human action required:
Rollback/recovery notes:
Next recommended phase:
```

Suggested work-item format: `P03-04 | persist approved mask assets | owner | prerequisite | acceptance test | evidence | status`. A checkbox alone is not proof of completion.

## 7. Existing verification inventory

These commands exist in the current repository. They are an inventory, not evidence that this planning task executed them. Inspect scripts for server/port/browser prerequisites before running them. Reuse the project's virtual environment; do not install packages automatically just to obtain a green result.

From `D:\Themoeye\project\teng1`:

```powershell
npm run typecheck
npm run lint
npm run build
npm run clinical-format-test
npm run contract-test
npm run state-test
npm run ui-safety-test
npm run api
npm run smoke
npm run a11y
npm run modality-test
backend\.venv\Scripts\python.exe -m unittest -v backend\test_octa_pipeline.py
git diff --check
```

From `D:\Themoeye\project\teng1\backend`:

```powershell
.\.venv\Scripts\python.exe train\preflight_octa.py --data-dir train\data\octa
.\.venv\Scripts\python.exe train\smoke_octa_pipeline.py
```

Add targeted tests for persistence, private asset serving, Unicode PDF, launch/recovery, benchmark instrumentation, and future approved classifier contracts as their phases are implemented. Do not assume the existing tests cover newly introduced behavior.

## 8. Release blockers, deferrable work, and stop conditions

### M1 release blockers

- Wrong image/mask/measurements attached to a case; stale review releasing the wrong report.
- Fabricated disease scores, misleading accuracy claims, or recorded output presented as live inference.
- A broken primary upload -> analysis -> review -> report path on the presentation machine.
- No reliable startup/recovery, silent data loss in approved demo persistence, or uncontrolled process handling.
- Unlicensed/unapproved sample display or redistribution; exposed patient identifiers or secrets.
- Thai report corruption if Thai reporting is included in the agreed demonstration scope.
- No traceable model/data provenance or no reproducible evidence for the displayed segmentation claims.
- A timing statement that contradicts observed behavior or has no defined measurement boundary.

### Usually defer until after M1

- Multi-disease retinal classifiers, structural-OCT/fundus branches, and unrelated model experiments.
- Full hospital multi-tenancy, production identity systems, billing, notification centers, and broad administration dashboards.
- PACS/DICOMweb/FHIR integration, cloud deployment, background workers, and distributed storage unless specifically required by an approved demo scenario.
- New anatomical FAZ/perfusion claims without the data and validation needed to support them.
- Decorative charts and new pages that do not improve the core explanation or reliability.

### Stop and request an appropriate decision when

- Data rights or patient/privacy authority is missing or ambiguous.
- The only available labels cannot support the chosen research question.
- A change would replace the submitted objective, require external coordination, incur cost, or alter user data beyond the authorized phase.
- A model result is too weak or confounded to support the intended claim. Report the result; do not invent a more favorable story.
- A dependency or security constraint prevents safe execution. Document alternatives and the remaining risk rather than bypassing controls.

## 9. Recommended immediate sequence

1. Execute **Phase 0** and obtain a stable scope/claims baseline.
2. Start **Phase 1** early, in parallel with **Phase 2** where possible.
3. Deliver **Phases 3-5** around the existing real segmentation workflow; run **Phase 6** alongside them after its data gate.
4. Run **Phase 7**, fix failures in the responsible phases, then release/rehearse through **Phase 8**.
5. Continue **Phases 9-10** only when their clinical-data and protocol prerequisites are met. These can overlap demo engineering if independently staffed and authorized, but must not destabilize the demo release.
6. Treat **Phase 11** as a separately approved institutional project, not a requirement for a strong YSC presentation.

The strongest near-term outcome is a reliable demonstration of what the system genuinely does, a transparent experiment behind it, and a concrete, justified route toward the disease-screening goal.
