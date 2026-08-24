---
name: Supabase managed connection DDL
description: The managed Supabase connector exposes PostgREST data access but not arbitrary SQL DDL.
---

The managed Supabase connection can read and write exposed tables through PostgREST, but it cannot create tables or run migrations. Keep schema migrations as checked-in SQL and apply them once through the connected project's Supabase SQL editor before enabling the related app writes.

**Why:** A successful connector authentication does not mean the target database schema exists, and REST returns a table-not-found error until DDL is applied.

**How to apply:** Verify the target project, run the checked-in migration in Supabase SQL Editor, then test the app's write route.