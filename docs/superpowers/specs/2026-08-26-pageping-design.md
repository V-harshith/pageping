# PagePing — Design

Date: 2026-08-26 (amended same day from PriceDrop v1)
Status: Approved
Hackathon: Convex All Gas Hackathon (vibeapps.dev, due 2026-09-22)

## Pitch

Paste ANY webpage URL. PagePing watches it for you — live, free — and emails
you when it changes. Presets: any change, keyword appears ("in stock", "results
declared"), price drops below X (auto-detected on shop pages). You can also
email a link to `track@…` to start watching. Open source; self-hostable free on
Convex's free tier.

## Why this wins (mapped to judging criteria)

- **Everyday app:** students track exam/result pages, patients track medicine
  restocks, shoppers track prices, job seekers track careers pages.
  Not a dev tool.
- **Paid-tool displacement:** Visualping ($13/mo), Distill.io ($12/mo), Wachete
  cripple their free tiers. changedetection.io is free but self-host only.
  PagePing is hosted, free, and open source.
- **Convex depth:** queries + mutations + actions + hourly crons + scheduled
  functions + live subscriptions everywhere + custom OTP auth.
- **Sponsor stack:** Firecrawl scrapes every watched page every hour (core
  loop). AgentMail sends OTP codes + change alerts AND receives
  track-by-email (inbox load-bearing twice). Codex/OpenAI builds it.
- **Live URL:** Convex static hosting component (`*.convex.site`).
- **Viral loop:** public `/w/<id>` pages show a live change timeline with diff
  highlights — strangers see value instantly.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + Tailwind |
| Hosting | Convex static hosting component → `*.convex.site` |
| Backend | Convex (all logic; no other server) |
| Scraping | Firecrawl Convex component (`scrape`, markdown/text output) |
| Email | AgentMail Convex component (send + receive inbox) |
| Auth | Custom email-OTP sessions (no passwords) |

OpenAI in-app usage is an optional stretch (AI Gateway needs paid plan);
conditions work deterministically without it.

## Core concept

Each check stores a normalized-content **hash** plus parsed extras (price if
found). Full snapshots are stored ONLY when content changed (cap 20 per watch).
Diff view renders between consecutive changed snapshots. Conditions:

1. `any-change`: hash differs from last check → alert.
2. `keyword`: term appears now and did NOT appear in previous snapshot → alert.
3. `price-below`: page exposes JSON-LD/OG price; current < targetPrice and
   lower than last alerted price → alert.

## Data model

```
users:      { email, createdAt }
otpCodes:   { email, codeHash, expiresAt }          // TTL ~10 min
sessions:   { userId, token, expiresAt }            // TTL ~30 days
watches:    { ownerEmail, url, title, faviconUrl?,
              condition,                            // any-change | keyword | price-below
              keyword?, targetPrice?, currency?,
              currentPrice?,                        // null if no price found
              status,                               // active | dead
              lastCheckedAt, lastAlertedAt,
              lastHash, failureCount }
snapshots:  { watchId, checkedAt, contentHash,      // stored only on change
              markdown, price? }
alertLog:   { watchId, kind, sentAt }               // dedupe
inbound:    { from, body, processedAt }             // track-by-email queue
```

Indexes: `watches by ownerEmail`, `watches by lastCheckedAt`,
`snapshots by watchId+checkedAt`, `otpCodes by email`, `sessions by token`.

## Flows

1. **Login:** email → AgentMail sends 6-digit code → verify → session cookie.
2. **Watch (web):** paste URL + pick preset (+ keyword/target price) → action
   scrapes via Firecrawl → mutation creates watch + first snapshot/hash →
   dashboard live-updates via subscription.
3. **Monitor:** cron hourly → due watches (active AND lastCheckedAt > 1h) →
   scrape each → hash compare / condition eval → insert snapshot if changed →
   send AgentMail alert (deduped) → 5 consecutive failures mark watch dead +
   notify once.
4. **Share:** `/w/<id>` public page — live change timeline, side-by-side diff of
   latest change, "watch this too" button.
5. **Track by email:** cron polls AgentMail inbox every 5 min → extract first
   URL in unseen messages → create watch (`any-change`) → confirmation reply
   with manage link.

## Guardrails

- Max 25 watches per user.
- No-page/unreachable URL rejected upfront; pages behind hard paywalls flagged.
- Alert dedupe: ≥6h between alerts per watch; keyword alerts fire once per
  appearance episode.
- Manual refresh rate limit: 1 per watch per 10 minutes.
- Snapshot cap 20/watch (oldest pruned).

## Error handling

- Firecrawl errors: toast + keep last known state; failureCount drives dead-marking.
- Invalid/expired OTP/session return typed errors mapped to friendly UI strings.
- Cron idempotent: re-running inserts duplicate checks harmlessly; dedupe via
  hashes + alertLog.

## Testing

Minimal runnable checks (no framework):
- Hash/diff engine unit checks: unchanged, changed, keyword-appear cases.
- Condition evaluator tests incl. price parsing from JSON-LD.
- OTP verify happy path + expired path (assert-based, run via `npx tsx`).
- E2E smoke: create watch against a stable real URL, assert first snapshot.

## Out of scope (YAGNI)

- CSS-selector-level diffing, visual screenshot diffs, mobile push, billing,
  teams/sharing, LLM summaries, i18n.
