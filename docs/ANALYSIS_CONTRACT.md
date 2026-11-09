# Thermoeye canonical analysis contract

The live application uses `octa-analysis-v2`. The browser uploads an image to
`POST /api/analyze`; the Next.js route validates the byte signature, MIME and
filename, sends the bytes to local `POST /octa/analyze`, and normalizes the
response before it is stored in a `CaseRecord`. The UI, dashboard, review page,
and PDFs read the normalized `VisionResult` attached to that case.

## Status and provenance

| Field | Type and nullability | Range / unit | Source and meaning | Display policy |
| --- | --- | --- | --- | --- |
| `schemaVersion` | string | `octa-analysis-v2` | Canonical contract version | Show in provenance |
| `analysisStatus` | enum | `measured`, `quality_blocked`, `modality_blocked`, `unavailable` | Gate and engine outcome | Always show status |
| `engine` | enum or `none` | `onnx_vessel_unet`, `heuristic_research_baseline`, `external_provider`, `ruleset`, `none` | Actual engine that produced the response | Show with model provenance; `none` for blocked/unavailable local results |
| `segmentationEngine` | enum or absent | ONNX or explicit research heuristic | Segmentation engine only | Never describe as disease prediction |
| `modelVersion` | string or null | Artifact/version identifier | Backend model artifact | Show when available |
| `modelTask` | string or null | Currently `vessel_segmentation` | Task performed by the model | Show; disease classifier is absent |
| `trainedModelConnected` | boolean | true only for the verified ONNX artifact | Backend artifact connection | Show in provenance |
| `preprocessingVersion` | string or null | Versioned pipeline name | Backend decoding/preprocessing | Show in provenance |
| `threshold` | number or null | 0 to 1 | ONNX sigmoid mask threshold | Show as segmentation threshold |
| `inputMode` | string or absent | Decoder mode, for example `L`, `RGB`, `RGBA`, `I;16` | Backend image decoder | Show in provenance, absent as N/A |
| `colorConversion` | string or absent | Deterministic conversion description | Backend conversion to model input | Show in provenance, absent as N/A |
| `modalityGateStatus` | string | `passed`, `passed_with_color_warning`, `blocked`, `not_evaluated` | Filename and backend preflight gate | Show status and reason |
| `modalityGateReason` | string | Human-readable reason | Backend gate | Show reason |
| `qualityStatus` | enum | passed, blocked, not evaluated | Backend quality gate | Show status |
| `failureReason` | string or null | — | Decoder, gate, or engine failure | Show when present |

## Measurements

All canonical percentages use `metricUnit: percent_0_100`. The normalizer
accepts a declared `fraction_0_1` source and converts it exactly once; it never
guesses from magnitude, parses numeric strings, clamps values, or converts null
to zero. `sourceMetricUnit` records the declared input unit.

| Field | Type and nullability | Range / unit | Meaning and validation |
| --- | --- | --- | --- |
| `vesselDensity` | number or null | 0–100 percent | Vessel mask coverage from the source image. Research segmentation measurement; no disease validity claim. |
| `fazRisk` | number or null | 0–100 percent | Legacy API key for the central 30% rectangle non-vessel fraction. It is a research proxy, not anatomical FAZ area or disease risk. |
| `perfusion` | number or null | 0–100 percent | Backend currently returns null; no invented perfusion formula is used. |
| `qualityScore` | number or null | 0–100 percent | Image-quality gate score, not diagnostic confidence. |
| `brightness`, `contrast`, `sharpness`, `artifactScore` | number or null | 0–100 percent | Quality diagnostics from the backend; unavailable values remain null. |
| `imageWidth`, `imageHeight` | integer or null | positive pixels | Decoded source dimensions; backend enforces at least 64 pixels in both axes and at most 16 million pixels total. |
| `metricUnit` | enum | `percent_0_100` | Unit of canonical numeric measurements. |
| `sourceMetricUnit` | enum or null | `fraction_0_1`, `percent_0_100` | Declared source unit before normalization; no unit means unknown. |

`vesselDensity`, `fazRisk`, and `perfusion` are forced to null unless the
analysis is measured by an allowed local segmentation engine. Quality
diagnostics can remain visible when segmentation is blocked. A modality block
takes precedence over a quality block; either prevents measurements even if a
malformed upstream payload also says measured. None of these numeric fields
is clinically validated. All finite values show at most two decimal places;
null displays `N/A`.

## Response envelope and remaining fields

| Field | Type / nullability / range | Source, meaning, and display |
| --- | --- | --- |
| `ok` | boolean, true on structured response | HTTP envelope success does not mean analysis is measured. Inspect `analysisStatus`. |
| `analysis` | canonical object | The sole source of measurement truth. |
| `analysisReceipt` | 64 lowercase hex characters | HMAC-SHA256 over normalized metadata (excluding image URLs), verified by queue API. Never treated as clinical validation or an access token. |
| `primaryDisease`, `riskLevel` | string, exactly `indeterminate` | No connected validated classifier. Show Indeterminate. |
| `riskScore`, `confidence` | always null | No calibrated disease prediction; show N/A. |
| `differentials`, `evidence` | arrays, currently empty | Provider/legacy disease assertions are discarded. |
| `label`, `finding`, `recommendation` | nonempty strings | Fixed application safety wording derived from canonical status; not provider-authored diagnosis. |
| `requestId` | string or null | Server-generated request UUID, shown in provenance. |
| `fileHash` | string or null | SHA-256 of the uploaded bytes; supports correlation without logging bytes/name. |
| `timestamp` | ISO-8601 string or null | Server analysis timestamp, shown in provenance. |
| `mimeType` | string or null | Detected/canonical image MIME. |
| `decodedFormat` | string or null | Pillow decoded `JPEG`, `PNG`, `WEBP`, or `TIFF`. |
| `previewDataUrl` | PNG/JPEG data URL or absent, under 2M characters | Backend currently returns metadata-stripped grayscale PNG, aspect-preserving, max 512 pixels. Temporary browser display only. |
| `segmentationMaskDataUrl` | PNG/JPEG data URL or absent, under 2M characters | Backend currently returns real binary mask PNG preview; only present for measured output. Temporary browser display only. |

Provenance strings are accepted only as nonempty strings and truncated to 600
characters. They document execution, not medical validation. Failure envelopes
carry an error and request ID: malformed request 400, >8 MB 413, unsupported or
mismatched signature/MIME 415, decoder/explicit filename rejection 422. Local
backend failure returns HTTP 200 with unavailable analysis and null values.
Direct Python gate blocks return structured HTTP 200 with null measurements.

## Case aliases and state flow

`analysisMetrics.visionResult` is the canonical source. The legacy fields below
are rebuilt from it on every normalization; they cannot override it:

| Compatibility field | Canonical source |
| --- | --- |
| `analysisMetrics.vesselDensity` | `visionResult.vesselDensity` |
| `analysisMetrics.fazRiskProxy` | `visionResult.fazRisk` |
| `analysisMetrics.perfusionDensityProxy` | `visionResult.perfusion` |
| `analysisMetrics.qualityScore`, brightness/contrast/sharpness/artifact/dimensions | Corresponding `visionResult` field |
| `analysisMetrics.confidenceScore`, `CaseRecord.confidence`, `CaseRecord.riskScore` | null |
| `CaseRecord.riskLevel` | indeterminate |
| `CaseRecord.clinicalClassification` | Derived research explanation; `quality_blocked` is a compatibility workflow marker for either blocked gate, never a disease label |
| `CaseRecord.status`, `qualityLabel`, `density`, `note` | Derived from canonical status/measurements; stale labels are replaced |
| `demoEngineVersion` | Schema version `octa-analysis-v2`, not a trained-model version |

Case metadata includes a safe uppercase ID (`[A-Z0-9-]`, 4–64 characters),
integer age 0–120, sex F/M, eye OD/OS/OU, allowed OCT/OCTA scan type, and text
context up to 600 characters. Duplicate IDs return 409 without overwriting;
malformed/unsigned/tampered uploads return 400; successful saves return 201.
Review notes preserve Unicode and permit 8–600 characters; timestamps use ISO
UTC. Reviewer approval only unlocks research output.

Actual upload ordering is browser preflight → Next analysis → local decoder →
luma conversion → separate gates → selected engine → source-mask measurements
→ API normalization/receipt → queue save of metadata → confirmed selected case
→ analysis/dashboard/report/PDF. There is no durable upload persistence or
image object store. The store strips raw images, masks, previews, names, and
unknown properties. Browser previews are transient and are lost on reload.
There is no localStorage/sessionStorage result cache. API responses use
`Cache-Control: no-store`; in-flight upload locks and delayed-snapshot merging
prevent stale selection and duplicate submissions.

## Disease fields

`primaryDisease` and `riskLevel` are always `indeterminate`; `riskScore` and
`confidence` are always null; `differentials` is always an empty array. The
connected model performs vessel segmentation only. Vessel Dice, mask coverage,
quality scores, heuristics, and literature statistics are never disease
accuracy or diagnosis. External providers, when explicitly enabled by both the
server and the upload request, are transport checks only and their prose or
measurements are discarded.

## Inputs and gates

JPEG, PNG, WebP, and TIFF are accepted when their byte signature and declared
MIME agree. Grayscale, RGB, RGBA, palette, and supported 16-bit images are
decoded deterministically. RGB uses ITU-R 601 luma divided by 255; alpha is
ignored; uint16 uses fixed division by 65535. Corrupt, multi-frame, float-mode,
too-small, oversized, and MIME-mismatched images fail closed. Generic filenames
are allowed. Explicit `face`, `skin`, `acne`, `portrait`, `selfie`, `person`, or
`fundus` filename signals are rejected as a safety preflight. This is a
heuristic input gate, not a validated modality classifier.

For ONNX, normalized grayscale is quantized to 8-bit, bilinearly resized to
256×256, and supplied as float32 `[1,1,256,256]` divided by 255. Model logits must
have shape `[1,1,256,256]` and be finite; sigmoid is applied and pixels strictly
greater than 0.5 become vessels. The binary mask is resized to source dimensions
with nearest neighbor before measurements. Model sessions are cached by path,
modification time, and size. The canonical artifact path is
`backend/models/octa/octa_vessel_unet.onnx`; the former root model path is used
only if the canonical artifact is absent. A broken canonical artifact does not
fall back. JPEG has no alpha channel; RGBA is tested in PNG. Color warnings
permit false-color data but do not establish that it is OCTA; generic photos
can pass this heuristic gate.

The quality gate is also heuristic: block when quality score <45, grayscale
contrast <4, or dark-pixel fraction >0.92. A color fraction >0.12 generates a
separate warning. These thresholds have no clinical validation claim.

`onnx_vessel_unet` records the artifact SHA in modelVersion;
`heuristic_research_baseline` records its rules version and trained=false;
`ruleset` cannot expose segmentation values; `none` means no engine output.
External requests require both `THERMOEYE_ALLOW_EXTERNAL_VISION=true` and
`allowExternal=true`, local gates already passed, local analysis unavailable,
and non-TIFF input. `external_provider` is recorded only after an actual
provider call succeeds. External disease prose is always discarded. The UI
does not opt in automatically, and verification runs disable provider keys.

## Release behavior

Only a measured local segmentation result with a usable metric can be approved
and downloaded as a research PDF. Blocked or unavailable results stay locked.
The current store is single-process memory; cases are lost at restart and
uploaded bytes are not persisted. Receipt signatures also become invalid at
restart unless a stable `THERMOEYE_ANALYSIS_SIGNING_KEY` is configured. A stable
key does not make storage durable or suitable for multiple workers.
