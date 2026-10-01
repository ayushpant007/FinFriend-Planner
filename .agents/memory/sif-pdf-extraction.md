---
name: SIF PDF extraction
description: The build-safe approach for extracting text from the local SIF research-pack PDFs.
---

SIF research packs should be pre-extracted into checked-in text companions and read server-side with the local structured parser. Keep the selected filename allowlisted through the SIF product map. These PDFs often extract table headings and values inline or on the same row; parse those layouts rather than relying on one label per line. Treat explicit em-dashes as unavailable data. The PMS master CSV contains PMS URL mappings and is not a SIF data source. A development-only `pdftotext` fallback is acceptable for newly added packs before extraction.

**Why:** Published autoscale runtimes do not include the `pdftotext` executable (`spawn pdftotext ENOENT`). Bundling `pdf-parse` into the Next.js route previously caused the production build to stall, so committed text companions avoid both runtime and bundling failures. Strict line-based parsing also silently missed NAV, expense ratio, return, and strategy values present in the SIFscan text; a PMS URL must not be substituted for the wrong SIF product.

**How to apply:** For new SIF source packs, add the real filename to the product map, generate a matching text companion during development, include text assets in the API route's production trace, parse inline table rows, and keep genuinely missing PDF fields as null/Data Not Available in the report.