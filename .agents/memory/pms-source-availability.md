---
name: PMS source availability
description: Availability and error handling for live PMS AIF World source pages
---

Treat the source CSV's URL Verification value as metadata, not a selection gate: it describes whether the URL was independently live-verified, not whether the app can fetch it now. Include every unique row with a valid HTTP(S) URL and show the verification label. The uploaded PMS master list is a URL mapping, not a guarantee that every remote page is still available. Individual PMS AIF World URLs can return HTTP 404 or time out even while other mapped pages work.

**Why:** A mapped `INVESCO India R.I.S.E` page returned an upstream 404 while `2POINT2 Long Term Value` continued to return live data. The source CSV can also mark most rows as needing live-page verification; excluding those rows would hide valid candidates before the app tries their URLs.

**How to apply:** Keep PMS report fetching server-side, validate source URLs as HTTP(S), retry transient failures, preserve upstream fetch status in the UI, and provide the exact source link plus a retry action rather than showing a generic missing-data message.