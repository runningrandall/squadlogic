---
name: UI and UX feedback March 2026
description: Critical user feedback on frontend routing, dashboard, and feature gaps
type: feedback
---

Key issues reported:
1. Dynamic route pages (teams detail, etc.) redirect to home page on direct access/refresh
2. Dashboard doesn't show live data or counters
3. Athletes/coaches need to be added to teams via dropdown (within org scope)
4. Groups are called "squads" in the UI
5. Challenges need to be assignable to squads, athletes, OR coaches (not just groups)
6. Need user administration UI
7. Navigation between pages is unreliable

**Why:** Static export + dynamic routes don't pre-render, causing CloudFront 404 → root page fallback.
**How to apply:** Consider moving to SSR or Lambda@Edge for dynamic pages, or use CloudFront Functions for URL rewriting.
