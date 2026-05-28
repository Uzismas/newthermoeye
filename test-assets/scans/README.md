# Synthetic Thermoeye Test Scans

These PNG files are generated demo assets for exercising the upload and analysis workflow.
They are not patient data, are not diagnostic, and must not be used as evidence for autism, Alzheimer disease, or any clinical condition.

Quick upload test files:

- `upload-demo-normal-octa.png`: expected `Normal screening pattern` with the default upload age 68.
- `upload-demo-alzheimer-risk-octa.png`: expected `Alzheimer-risk screening pattern` with the default upload age 68.
- `upload-demo-quality-blocked-octa.png`: expected `Quality blocked` with the default upload age 68.

Important: the current app ruleset has only Normal, Alzheimer-risk, and Quality-blocked outcomes.
Files named `autism-demo-placeholder-*` are placeholders requested for autism-flow testing, but the current app will not output Autism until the clinical ruleset and UI are changed.

## Files

- `upload-demo-normal-octa.png`: intended demo label `upload_demo_normal`, current app expected `Normal screening pattern`, demo age 68, VD 82%, quality 99%.
- `upload-demo-alzheimer-risk-octa.png`: intended demo label `upload_demo_alzheimer_risk`, current app expected `Alzheimer-risk screening pattern`, demo age 68, VD 22%, quality 75%.
- `upload-demo-quality-blocked-octa.png`: intended demo label `upload_demo_quality_blocked`, current app expected `Quality blocked`, demo age 68, VD 12%, quality 54%.
- `normal-control-01-octa.png`: intended demo label `normal_control`, current app expected `Normal screening pattern`, demo age 34, VD 69%, quality 99%.
- `normal-control-02-octa.png`: intended demo label `normal_control`, current app expected `Normal screening pattern`, demo age 34, VD 72%, quality 99%.
- `normal-control-03-octa.png`: intended demo label `normal_control`, current app expected `Normal screening pattern`, demo age 34, VD 65%, quality 99%.
- `autism-demo-placeholder-01-octa.png`: intended demo label `autism_placeholder`, current app expected `Alzheimer-risk screening pattern`, demo age 12, VD 27%, quality 82%.
- `autism-demo-placeholder-02-octa.png`: intended demo label `autism_placeholder`, current app expected `Alzheimer-risk screening pattern`, demo age 12, VD 28%, quality 82%.
- `autism-demo-placeholder-03-octa.png`: intended demo label `autism_placeholder`, current app expected `Alzheimer-risk screening pattern`, demo age 12, VD 35%, quality 86%.
