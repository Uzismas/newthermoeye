# Phase 3 Completion Record

Phase: 3 - private persistence for explicitly approved demo cases  
Status: COMPLETE WITH LIMITATIONS  
Date and environment: 2026-10-02; Windows PowerShell, Node.js 24.15.0, npm 11.12.1, Next.js 16.2.6  
Authorized scope: Phase 3 only

## Deliverables

| File | Result |
| --- | --- |
| `features/clinical-console/server/persistence.ts` | Private JSON manifest, per-case source/mask assets, hash/HMAC binding, atomic writes, backup recovery, allowlist, reset/restore adapter |
| `features/clinical-console/server/analysis-receipt.ts` | Stable signing-key resolution for durable local mode; explicit env key or private generated key |
| `app/api/cases/[caseId]/assets/[asset]/route.ts` | Session-gated source/mask route with safe IDs and hash/binding verification |
| `app/api/demo-storage/route.ts` | Narrow reset preview/reset/restore API |
| `app/api/uploads/queue/route.ts`, `app/api/analyze/route.ts` | Explicit approved-demo source upload and transient asset handoff; ordinary queue remains transient |
| `features/clinical-console/server/store.ts`, `app/api/console-state/route.ts`, report preview/actions | Durable state restoration, private asset URLs, review/action persistence, selected-case reset |
| `features/clinical-console/ThermoeyeConsole.tsx`, `features/clinical-console/components/cases-view.tsx` | Approved upload sends original bytes; multipart/JSON upload support; durable/transient status messaging |
| `scripts/persistence-regression.mjs` | Focused adapter integrity/failure/security regression |
| `scripts/persistence-live-regression.mjs` | Fresh Next.js + inference-fixture restart regression |
| `docs/ysc/DEMO_STORAGE_DESIGN.md` | Storage contract and recovery/reset procedure |

## Exact verification commands and evidence

All commands ran from `D:\Themoeye\project\teng1` on 2026-10-02.

| Exact command | Result | Evidence |
| --- | --- | --- |
| `npm run build` | PASS; production routes compiled, including private asset and demo-storage routes | Next build output; one NFT tracing warning caused by intentional local filesystem access in the private adapter |
| `npm run persistence-test` | PASS; exact source/mask bytes, restart reload, duplicate-safe update, stale HMAC quarantine, corrupt asset quarantine, simulated write failure, traversal, and allowlist checks | `scripts/persistence-regression.mjs` output |
| `npm run persistence-live-test` | PASS; approved source, mask, measurements, and approved review survived stopping/restarting Next.js and the local inference fixture; duplicate, private route, and traversal checks passed | `scripts/persistence-live-regression.mjs` output |
| `npm run state-test` | PASS | Existing nullable/state/stale-snapshot regression output |
| `npm run contract-test` | PASS | Existing canonical unit/null/provenance/signature regression output |
| `npm run api` | PASS; unauthorized console state, malformed/tampered/unsigned queue rejection, duplicate ID, canonical values, review/release guards, PDF and DICOM paths | Existing API flow output |
| `npm run lint` | PASS; no diagnostics | ESLint output |
| `npm run typecheck` | PASS; `tsc --noEmit` | TypeScript output |
| `git diff --check` | PASS; no whitespace errors or conflict markers | Git output contained only existing LF-to-CRLF notices |

## Acceptance results

| G3 criterion | Result | Evidence and limits |
| --- | --- | --- |
| Approved case retains exact image, mask, measurements, and review after refresh/restart | PASS | Live regression reloaded `console-state` and fetched both private assets after both service processes restarted. Browser refresh uses the same state endpoint and controlled asset URLs. |
| Reanalysis/measurement changes invalidate stale integrity/approval | PASS | Case binding covers canonical case/receipt and asset hashes; focused regression quarantines a changed vessel density. A new case ID is required by existing duplicate protection. |
| Ordinary uploads remain transient; private assets stay outside `public/` | PASS | Durable path requires explicit flag plus allowlist; JSON queue path remains metadata-only. Storage root is configurable and defaults to `.thermoeye-private/`, ignored by Git and outside `public/`. |
| Safe writes and recovery leave truthful state | PASS | Temporary file + flush + rename, manifest-after-assets ordering, backup fallback, missing/corrupt asset quarantine, and simulated write-failure regression. |
| Reset/restore only touches selected approved records | PASS | `/api/demo-storage` validates allowlisted IDs and operates on the selected case directory/manifest record; restore uses the explicit sibling backup. |
| Unauthorized/traversal/duplicate/failure cases covered | PASS | Existing API flow proves 401 and duplicate rejection; focused/live regressions prove write failure, traversal, corrupt/missing integrity, and private route behavior. |

## Limitations and blockers

- This is a single local JSON/process adapter for the demonstration. It is not production privacy compliance, multi-user concurrency control, encryption-at-rest, tenant isolation, or a clinical record system.
- Durable persistence is opt-in and requires operator configuration. No case is seeded automatically.
- Phase 1 still has unresolved ROSE-O licensing evidence and unresolved rights for all internet-reference images. No such image was seeded or added to the durable store.
- The stored mask is the canonical mask bytes returned by the current local analysis response. This phase does not change the model or analysis contract.
- The existing Phase 5 Thai/Unicode PDF limitation remains. This phase did not change report rendering.
- HMAC integrity is separate from authentication and clinical validity. The session token remains the existing local demo session mechanism.

## Human decisions still required

D1-D4 remain open. No licensing, product-name, presentation-title, accuracy-claim, or disease-data decision was inferred or resolved.

## Next recommendation

Proceed only to the next phase when the team authorizes it. Phase 4 was not started by this work.
