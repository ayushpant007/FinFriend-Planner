---
name: SIF PDF extraction
description: The build-safe approach for extracting text from the local SIF research-pack PDFs.
---

SIF research packs should be pre-extracted into checked-in text companions and read server-side with the local structured parser. Keep the selected filename allowlisted through the SIF product map. A development-only `pdftotext` fallback is acceptable for newly added packs before extraction.

**Why:** Published autoscale runtimes do not include the `pdftotext` executable (`spawn pdftotext ENOENT`). Bundling `pdf-parse` into the Next.js route previously caused the production build to stall, so committed text companions avoid both runtime and bundling failures.

**How to apply:** For new SIF source packs, add the real filename to the product map, generate a matching text companion during development, read that companion in the Node API route, and keep missing PDF fields as null/Data Not Available in the report.