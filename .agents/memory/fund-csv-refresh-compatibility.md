---
name: Fund CSV refresh compatibility
description: Compatibility rules for updated mutual-fund metrics and holdings CSVs.
---

Updated holdings datasets may identify funds only with `Fund Name` rather than `Scheme Code`. The loader must map normalized fund names to the corresponding category and direct-plan scheme code before serving holdings.

**Why:** The replacement holdings files use the fund-name schema, and a scheme-code-only parser silently returns no holdings.

**How to apply:** Keep fund and holdings file signatures in the server cache key so replacing CSV files is reflected without requiring a process restart.