---
name: AIF registry ingestion
description: How the uploaded SEBI AIF workbook is made available to the app
---

The uploaded AIF registry is converted into a checked-in JSON asset before runtime; the app should not depend on an `.xls` parser being present in the published Node runtime.

**Why:** The source workbook is a legacy binary Excel file, while the published app runtime should remain free of one-off workbook parsing dependencies.

**How to apply:** When the registry is replaced, regenerate the JSON from the newest uploaded workbook, preserve only source-backed fields, deduplicate names, and keep unavailable fund statistics as unavailable rather than estimating them.