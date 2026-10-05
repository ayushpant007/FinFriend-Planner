---
name: Saved client conversion lists
description: Product behavior for separating converted and not-yet-converted saved clients.
---

Marking a saved client converted should move them from the default “To convert” list into a separate “Converted” list. Changing them back to not converted should move them back. Status changes must not delete the investor or report records.

**Why:** The client sidebar becomes too long when converted clients remain mixed with clients still awaiting conversion, but their reports must remain accessible.

**How to apply:** Keep both status-filtered lists available in the sidebar, persist the converted flag, and let the item leave the current list after a successful status update.
