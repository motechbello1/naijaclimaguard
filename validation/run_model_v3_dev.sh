#!/usr/bin/env bash
set -euo pipefail

# Model v3 development only.
# The dedicated registry contains pre-2022 independently documented events only.
# The Python harness itself also hard-filters all development rows before 2022-01-01.
python validation/model_v3_dev.py \
  --features "${1:-validation/features_daily.csv}" \
  --events validation/model_v3_event_registry.csv \
  --output "${2:-validation/model_v3_development_results.json}"
