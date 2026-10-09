---
name: Headless browser validation
description: Replit Chromium target and text-transform quirks that can create false UI-test failures.
---

When controlling Chromium through CDP, its target list may include a Replit extension background page alongside the app page. Attach to a normal page target before navigating. CSS `text-transform` can also change visible text casing, so case-sensitive `innerText` assertions may fail despite a healthy page.

**Why:** Browser validation exposed both issues while testing the planner: the extension target was selected first, and an uppercase badge did not match its source capitalization.

**How to apply:** Select a non-extension page target, then assert using semantic elements or case-normalized visible text.
