# Phase 3 Demo Storage Design

Status: implemented for Phase 3 only. This is a private local demo store, not a production patient-data service.

The store uses a versioned JSON manifest at `THERMOEYE_DEMO_STORAGE_DIR/cases.json` and per-case binary files under `assets/<case-id>/source.bin` and `assets/<case-id>/mask.bin`. The storage root is outside `public/`. A sibling `cases.json.bak` and `backup-assets/` are used for the explicit reset/restore flow. No SQLite, cloud object store, or new dependency is introduced.

Durability requires both conditions: the request must set `persistApprovedDemo=true`, and the case ID must appear in the operator-controlled `THERMOEYE_APPROVED_DEMO_CASE_IDS` allowlist. Without both conditions, queue behavior remains the existing metadata-only, single-process transient path. The approved path carries the original upload bytes, verifies their SHA-256 against the canonical `visionResult.fileHash`, stores the returned mask bytes, and records the source/mask hashes, MIME types, byte counts, canonical case, review/action state, timestamps, and a keyed binding.

The binding is an HMAC over the case, canonical analysis receipt, review/action state, and asset metadata. The analysis receipt key is read from `THERMOEYE_ANALYSIS_SIGNING_KEY`; when durable storage is configured and that variable is absent, a private generated key is created beside the manifest. The key is never returned to the browser or committed. Integrity does not provide authentication or clinical validation; all storage and asset routes still require the existing console session.

Writes create private temporary files, flush them, and rename them into place. The manifest is written after asset files. A failed write returns an explicit error and does not publish a new manifest record. On startup, the current manifest is parsed first, then the backup is tried. Each record is checked for safe ID, allowlist membership, receipt validity, asset existence, asset hash, and HMAC binding. Invalid or missing records are quarantined from the restored state and never substituted with a public fixture.

Only `/api/cases/<safe-case-id>/assets/source` and `/api/cases/<safe-case-id>/assets/mask` can serve private assets. They require a valid session, a safe case ID, an allowlisted approved case, and a matching stored hash/binding. Arbitrary filesystem paths, traversal segments, and public URLs are not accepted. `console-state` and report preview return controlled route URLs for restored approved cases; ordinary uploads have no durable asset URL.

Reset and restore are narrow operations at `/api/demo-storage`. `GET ?caseId=...` previews byte counts and timestamp. `POST {"action":"reset","caseId":"..."}` only accepts an allowlisted case, writes the backup first, then removes that case's directory and manifest record. `POST {"action":"restore"}` restores the explicit backup and its case asset directories. These operations never recursively clear a workspace or a generic upload directory.

No image is seeded by this phase. Phase 1 still marks ROSE-O licensing and all internet-reference image rights as unresolved, so those assets remain excluded. The operator must explicitly configure only a human-approved demo case ID and provide its source through the approved upload path.
