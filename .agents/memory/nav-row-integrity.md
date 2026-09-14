---
name: NAV row integrity
description: The invariant used when displaying live mutual-fund NAVs.
---

The selected fund row's scheme code is the source of truth for its live NAV. Do not silently replace it with a fuzzy name-search result, because mutual-fund names have multiple plans and legacy scheme codes can point to another fund.

**Why:** A legacy code returned a 2014 NAV for an institutional option while the UI selected a current regular-plan fund. A fuzzy overlap check accepted the wrong response.

**How to apply:** When a provider response does not match the selected row's scheme name and plan, reject it and correct the source row rather than displaying a substituted NAV.

Known scheme renames may be canonicalized during name validation when the selected row still uses the same authoritative code and plan.

**Why:** AMFI can continue publishing NAVs under a scheme's earlier name after consumer-facing sources adopt a new name.

**How to apply:** Add only narrow, verified old-name/new-name aliases before token comparison; never weaken plan checks or use the alias to replace the row's code.