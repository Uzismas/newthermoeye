# -*- coding: utf-8 -*-
import sys
from datasets import load_dataset

# Candidate OCT classification datasets on HuggingFace (Kermany-style: CNV/DME/DRUSEN/NORMAL)
candidates = [
    "Jatinkâ€¦",  # placeholder skip
]
# Real candidates to try
real_candidates = [
    "hf-vision/oct2017",
    "keremberke/oct-classification",
    "mariaherrerot/oct2017",
    "DeepEyeNet/oct",
    "Falah/retinal_oct",
    "aditya11997/retinal_oct_analysis2",
]

for name in real_candidates:
    try:
        print(f"\n=== Trying {name} ===", flush=True)
        ds = load_dataset(name, split="train", streaming=True)
        first = next(iter(ds))
        print(f"  OK | keys={list(first.keys())}", flush=True)
        # show feature info
        try:
            full = load_dataset(name, split="train")
            print(f"  rows={len(full)} features={full.features}", flush=True)
        except Exception as e2:
            print(f"  (streaming only) sample keys shown above", flush=True)
        print(f"  >>> USABLE: {name}", flush=True)
        break
    except Exception as e:
        print(f"  FAIL: {str(e)[:120]}", flush=True)
