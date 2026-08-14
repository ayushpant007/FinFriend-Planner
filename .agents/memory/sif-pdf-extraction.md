---
name: SIF PDF extraction
description: The build-safe approach for extracting text from the local SIF research-pack PDFs.
---

SIF research packs should be read server-side with the environment's `pdftotext` utility, then passed through the local structured parser. Keep the selected filename allowlisted through the SIF product map.

**Why:** Bundling the `pdf-parse` package into the Next.js route caused the production build to stall and the workflow never reached the server phase. The installed command-line extractor avoids that bundling cost while preserving dynamic PDF-backed reports.

**How to apply:** For new SIF source packs, add the real filename to the product map, invoke `pdftotext` only from a Node runtime API route, and keep missing PDF fields as null/Data Not Available in the report.