# Hackathon log

- **Project:** PagePing
- **Event:** Convex All Gas Hackathon
- **What it does:** Paste any URL to watch the page for changes (any change, keyword appears, or price below a threshold) and get email alerts on a public, shareable diff timeline.
- **Live app:** https://abundant-sardine-977.convex.site
- **Repo:** https://github.com/V-harshith/pageping
- **Frontend:** Convex static hosting
- **Convex deployment:** https://abundant-sardine-977.convex.cloud
- **Components:** @convex-dev/static-hosting, @firecrawl/firecrawl-convex
- **Convex features:** queries, mutations, actions, HTTP actions, crons, scheduled functions, indexes, file storage, realtime queries
- **Auth:** Other (custom email-OTP via AgentMail REST API)
- **AI models:** none
- **Started:** 2026-08-26T06:52:02Z
- **Last updated:** 2026-08-30T07:53:57Z

## Log

### 2026-08-26 - cc8817f
Wrote the implementation plan: 17 tasks, TDD, from engine to deploy
(`docs/superpowers/plans/2026-08-26-pageping.md`).

### 2026-08-26 - 5d75c01
Scaffolded the Vite + React + Tailwind SPA that Convex static hosting serves.

### 2026-08-26 - 456f626
Shipped the change-detection engine: content hash, price parsing with `$ € £ ¥ ₹`
support, the three alert conditions (any-change, keyword, price-below), and a
word-level diff, unit-tested (`src/lib/engine.ts`, `tests/engine.test.ts`).

### 2026-08-27 - dd96398
Added the Convex schema — users, sessions, watches, snapshots, alerts — with
indexes on the hot query paths (`convex/schema.ts`).

### 2026-08-27 - 1dc9e4a
Added magic-link login: email OTP hashed with Web Crypto, session tokens,
30-day sessions (`convex/auth.ts`).

### 2026-08-27 - 8b0b99c
Added watch CRUD with a short public id for shareable `/w/<id>` pages
(`convex/watches.ts`).

### 2026-08-27 - d486cfd
Shipped the check pipeline: an action scrapes the page via Firecrawl, diffs
against the last snapshot, and records snapshots and alerts; an hourly cron
scans due watches; an inbound HTTP webhook forces a recheck for logged-in users
(`convex/check.ts`, `convex/scanner.ts`, `convex/http.ts`, `convex/crons.ts`).

### 2026-08-27 - 86c5ac6
Built the whole UI: routing shell, magic-link login, dashboard with live
snapshot feed, and the public watch page, all realtime via Convex queries
(`src/pages/`, `src/components/`).

### 2026-08-27 - 5e79e2a
Production deploy configuration, README with self-host instructions, and the
design system tokens + branding motion pass.

### 2026-08-27 - c132e71
Switched OTP delivery to AgentMail's REST API (dropped the broken
@agentmail/convex component), fixed inbox provisioning, trimmed alert titles,
and shipped the light editorial retheme.

### 2026-08-28 - b65a115
Shipped the five-feature close-out: price sparkline on watch pages,
pause/resume per watch, webhook delivery on alerts, screenshots stored in
Convex file storage, and AI change summaries written to every new snapshot
(`src/components/Sparkline.tsx`, `convex/check.ts`, `convex/webhooks.ts`,
`convex/ai.ts`). Deployed functions to the production deployment and the
built SPA to Convex static hosting; live app verified returning the dashboard
and public watch pages.
