---
name: Supabase secret runtime
description: Runtime constraint for this app's server-side Supabase report persistence
---

Use the configured Supabase URL and server key from Replit Secrets for server-side investor/report reads and writes rather than assuming the Replit-managed Supabase connector is attached.

**Why:** The app can have valid Supabase Secrets while the managed connector returns “No supabase connection found for this customer.” That makes report generation fail before data reaches durable storage and causes shared links to show “Report not found.”

**How to apply:** Keep the service-role key server-only, use it for the RLS-protected investor/report tables, and verify a fresh report save plus a public report lookup after any connection change.