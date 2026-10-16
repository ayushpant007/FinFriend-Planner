---
name: Supabase secret runtime
description: Runtime constraint for this app's server-side Supabase report persistence
---

Use the configured Supabase URL and server key from Replit Secrets for server-side investor/report reads and writes rather than assuming the Replit-managed Supabase connector is attached. Treat local file/KV report writes as optional caches, never as the success condition for durable report storage.

**Why:** The app can have valid Supabase Secrets while the managed connector returns “No supabase connection found for this customer.” Local filesystem storage may also fail or be instance-specific in deployment; letting it override a successful Supabase save can falsely report that a proposal was not saved.

**How to apply:** Keep the service-role key server-only, use it for the RLS-protected investor/report tables, and verify saved proposal data can be retrieved by report ID. Make client navigation depend on the durable-save response and surface failures instead of silently navigating.