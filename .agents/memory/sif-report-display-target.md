---
name: SIF report display target
description: Distinguishes the generated report screen from its print/PDF output.
---

When changing SIF report layout, distinguish the in-app screen shown after Generate Report from print/PDF output; do not assume a print request.

**Why:** The user clarified that their page-flow and header request targeted the in-app report screen, not PDF.

**How to apply:** Keep screen layout changes scoped to the consolidated report view and leave print styles unchanged unless the user explicitly asks for print/PDF changes.