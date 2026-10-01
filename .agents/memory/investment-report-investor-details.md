---
name: Investment report investor details
description: How investor information from the SIF/PMS/AIF selection form reaches generated reports and print PDFs.
---

Investor details and the investment amount should be carried from the selection form to the generated report using same-tab session storage, not URL query parameters. Include the details panel in every product report template so it also appears in browser-generated PDFs.

**Why:** Names, birth dates, phone numbers, and email addresses should not be exposed in URLs or browser history; the user also needs these details in the printed report.

**How to apply:** Reuse the shared session-storage key and normalized detail shape when adding fields. Keep report-specific product data separate from the investor-entered values, and ensure the details panel is not hidden by print styles.