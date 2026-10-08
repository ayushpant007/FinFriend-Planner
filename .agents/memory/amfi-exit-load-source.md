---
name: AMFI Exit Load verification
description: Reliable source and identity rules for displaying mutual-fund Exit Load details.
---

**Rule:** Use AMFI's official Scheme Details data for Exit Load, and display it only after verifying the selected scheme code, fund house, plan, and available ISIN against the source records. Allow a changed provider name only through a specifically verified rename mapping with those identity checks intact. An empty or missing Exit Load field means unavailable; it must never be presented as “No Exit Load.”

**Why:** Exit Load can vary by scheme and plan, and an absent upstream value is not evidence that the fee is zero. Provider names can change, but local catalogs can also contain duplicate or misassigned codes and ISINs, so an arbitrary name mismatch must not be accepted.

**How to apply:** Filter duplicate rows by plan. For ETFs with no plan in both providers, require exact name, code, fund house, and ISIN; keep AMFI “N/A” distinct from nil. Preserve verified rename mappings and source links.
