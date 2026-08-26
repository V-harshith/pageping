# PriceDrop — Design

Date: 2026-08-26
Status: Approved
Hackathon: Convex × Codex × Firecrawl × AgentMail (vibeapps.dev, due 2026-09-22)

## Pitch

Paste any product URL from any store. PriceDrop watches the price live and emails
you the moment it drops. You can also email a product link to `track@…` and a
tracker appears. Every screen updates in real time via Convex subscriptions.

## Why this wins (mapped to judging criteria)

- **Everyday app:** anyone who shops online uses it this week. Not a dev tool.
- **Convex depth:** queries + mutations + actions + hourly crons + scheduled
  functions + live subscriptions on every page + custom OTP auth.
- **Sponsor stack:** Firecrawl scrapes every tracked product (core loop).
  AgentMail sends OTP codes and drop alerts AND receives track-by-email
  (inbox is load-bearing twice). OpenAI Codex builds the app (required tooling).
- **Live URL:** frontend on Convex static hosting component (`*.convex.site`).
- **Viral loop:** public shareable tracker pages `/t/<id>` with live sparkline.

## Stack

| Layer | Choice |
|---|---|
| Frontend | Vite + React + Tailwind |
| Hosting | Convex static hosting component → `*.convex.site` |
| Backend | Convex (all logic; no other server) |
| Scraping | Firecrawl Convex component (`/v1 scrape`) |
| Email | AgentMail Convex component (send + receive) |
| Auth | Custom email-OTP sessions (no passwords) |

OpenAI in-app usage (deal verdicts via AI Gateway) is an optional stretch — it
requires a paid Convex plan. Verdicts work deterministically off price history.

## Data model (convex/)

```
users:      { email, createdAt }
otpCodes:   { email, codeHash, expiresAt }        // TTL ~10 min
sessions:   { userId, token, expiresAt }          // TTL ~30 days
trackers:   { ownerEmail, url, title, imageUrl,
              currency, currentPrice, lowestPrice,
              targetPrice?, status,               // active | dead
              lastCheckedAt, lastAlertedAt }
pricePoints:{ trackerId, price, checkedAt }       // time series
alertLog:   { trackerId, price, sentAt }          // dedupe per drop event
inbound:    { from, body, processedAt }           // track-by-email queue
```

Indexes: `trackers by ownerEmail`, `trackers by lastCheckedAt`,
`pricePoints by trackerId+checkedAt`, `otpCodes by email`,
`sessions by token`.

## Flows

1. **Login:** enter email → action generates code, stores hash, AgentMail sends
   it → user enters code → mutation verifies, creates session token (cookie) →
   logged in.
2. **Track (web):** paste URL → action calls Firecrawl scrape → parse price,
   title, image, currency from JSON-LD / OG tags / common selectors → mutation
   creates tracker + first pricePoint → dashboard live-updates via subscription.
3. **Monitor:** cron every hour → batch of due trackers (status=active AND
   lastCheckedAt older than 1h) → scrape each (action) →
   insert pricePoint → if price < previous alert baseline and dedupe window
   passed → send AgentMail alert, log to alertLog. Consecutive failures ≥ 5 →
   mark tracker `dead`.
4. **Share:** `/t/<id>` public page — live chart, current vs lowest price,
   "track this too" button (clones URL into viewer's account after login).
5. **Track by email:** cron polls AgentMail inbox every 5 min → for each unseen
   message, extract first URL in body → scrape → create/reply confirmation with
   tracker link → mark processed.

## Guardrails

- Max 20 trackers per user (crawl-cost cap); clear error message at limit.
- Pages with no parseable price are rejected upfront ("couldn't find a price").
- Scrape failure: retry next cycle; 5 consecutive failures mark tracker dead +
  one notification email.
- Alert dedupe: only alert when price < lowest alerted price so far; min 6h
  between alerts per tracker.
- Rate limit manual refreshes: 1 per tracker per 10 minutes.

## Error handling

- Firecrawl errors surface as toast + tracker stays at last known state.
- Invalid/expired OTP and session tokens return typed error strings the UI maps
  to friendly messages.
- Cron failures are idempotent: re-running a check just inserts another
  price point; alerts dedupe via alertLog.

## Testing

Minimal runnable checks (no framework):
- Price parser unit checks: JSON-LD offer, OG meta, fallback selector cases.
- OTP verify happy path + expired path via assert-based test file run with
  `npx tsx`.
- One end-to-end smoke: create tracker against a stable real product URL,
  assert price point inserted.

## Out of scope (YAGNI)

- Multi-user sharing/collaboration, browser extension, mobile push,
  payment/billing, LLM features (until paid-plan gateway), i18n.
