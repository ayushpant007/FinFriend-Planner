---
name: AMFI Exit Load verification
description: Reliable source and identity rules for displaying mutual-fund Exit Load details.
---

**Rule:** Use AMFI's official Scheme Details data for Exit Load, and display it only after verifying the selected scheme code, fund house, plan, and available ISIN against the source records. An empty or missing Exit Load field means unavailable; it must never be presented as “No Exit Load.”

**Why:** Exit Load can vary by scheme and plan, and an absent upstream value is not evidence that the fee is zero. Incorrectly mapping a provider response to a selected fund can misstate investment costs.

**How to apply:** For other reports or fund sources, reuse the same strict identity checks, preserve the AMFI source link, and keep unavailable or mismatched records visibly distinct from a confirmed no-load statement.
