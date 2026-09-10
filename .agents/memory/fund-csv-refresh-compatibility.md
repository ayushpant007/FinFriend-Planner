---
name: Fund CSV refresh compatibility
description: Compatibility rules for updated mutual-fund metrics and holdings CSVs.
---

Updated holdings datasets may identify funds only with `Fund Name` rather than `Scheme Code`. The loader must match the full plan-specific name first, then use normalized names only as a fallback.

**Why:** The replacement holdings files use the fund-name schema, and stripping `Direct`/`Regular` before matching assigns both plan rows to the direct scheme.

**How to apply:** Keep fund and holdings file signatures in the server cache key so replacing CSV files is reflected without requiring a process restart; preserve plan tokens during exact-name matching.

Commodity fund rows can also have a blank scheme code even when the scheme is valid. Resolve a known missing code from the checked-in master instead of dropping the row from the selector.

**Why:** The commodities dataset included `SBI Gold Reg` without a code, so the curated-funds API discarded the regular option before the allocation dropdown could display it.

**How to apply:** Keep missing-code fallbacks narrowly scoped to the affected commodity label and use the authoritative master code; do not loosen the API to emit selectable rows with empty codes.

Holdings loaders must keep a single all-assets row visible when source rounding reports slightly more than 100%; clamp that displayed row to 100% instead of dropping it.

**Why:** Commodity holdings can report the only holding at values such as 100.07%, and the previous cap logic returned an empty list.

**How to apply:** Preserve normal multi-row capping behavior, but handle the first over-100% row as a rounded all-assets position.