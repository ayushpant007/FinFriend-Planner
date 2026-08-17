---
name: PMS source availability
description: Availability and error handling for live PMS AIF World source pages
---

The uploaded PMS master list is a URL mapping, not a guarantee that every remote page is still available. Individual PMS AIF World URLs can return HTTP 404 or time out even while other mapped pages work.

**Why:** A mapped `INVESCO India R.I.S.E` page returned an upstream 404 while `2POINT2 Long Term Value` continued to return live data.

**How to apply:** Keep PMS report fetching server-side, retry transient failures, preserve the upstream status in the UI, and provide the exact source link plus a retry action rather than showing a generic missing-data message.