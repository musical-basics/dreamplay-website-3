# DreamPlay Website 3 Repo Context

Last reviewed: 2026-04-17

## What this repo is

This repo is the DreamPlay public website plus lightweight logged-in account flows.

At a high level it currently does 4 things:
- markets DreamPlay One and DreamPlay One Pro
- routes visitors through landing-page journeys and preorder flows
- captures leads, newsletter signups, waitlist submissions, and chatbot conversations
- provides a Supabase-auth buyer/VIP area, including the current reservation decision portal

Important: there is **no `README.md` at repo root**. The practical source-of-truth files are the route files, `docs/PRICING.md`, and `dreamplay-website-strategy-and-implementation-plan.md`.

## Stack

From `package.json`:
- Next.js 16 (`next@16.0.10`)
- React 19 (`react@19.2.1`)
- TypeScript
- Tailwind CSS
- Supabase (`@supabase/ssr`, `@supabase/supabase-js`)
- Resend
- Vercel AI SDK (`ai`, `@ai-sdk/google`, `@ai-sdk/anthropic`)
- Recharts
- Radix UI components

## High-level architecture

### 1. App Router site shell
Core app entry points:
- `src/app/layout.tsx`
- `src/app/page.tsx`
- `src/middleware.ts`

`src/app/page.tsx` is only a fallback. Real homepage behavior is controlled by middleware, which rewrites `/` to the currently assigned journey page.

### 2. Journey engine / traffic routing
Primary routing logic:
- `src/middleware.ts`
- `src/config/journeys.ts`

Current behavior:
- middleware refreshes Supabase auth session on every request
- `/` rewrites to the assigned homepage
- `/buy` rewrites to the assigned checkout page
- bots are forced onto `STANDARD_JOURNEY` for SEO-safe pricing behavior
- `journey_a` is the live human journey right now
- `journey_b` exists but is disabled with `weight: 0`

Current live journey config points humans to:
- homepage: `/premium-offer`
- checkout: `/customize`

### 3. Marketing pages
Main public marketing routes live under:
- `src/app/(website-pages)`

Key pages:
- `src/app/(website-pages)/premium-offer/page.tsx` — current homepage-like main landing page
- `src/app/(website-pages)/intro-offer/page.tsx` — alternate landing page
- `src/app/(website-pages)/extended-offer/page.tsx` — longer-form sales page
- `src/app/(website-pages)/dreamplay-pro/page.tsx` — dedicated DreamPlay One Pro flagship page
- `src/app/(website-pages)/product-information/page.tsx` — specs, geometry, and One vs Pro comparison tables
- `src/app/(website-pages)/buyers-guide/page.tsx`, `how-it-works/page.tsx`, `why-narrow/page.tsx`, etc. — education/supporting pages

Component organization is mostly by page family under:
- `src/components/premium-offer/*`
- `src/components/extended-offer/*`
- `src/components/intro-offer/*`
- other shared components in `src/components/*`

### 4. Checkout / preorder flow
Main buying flow files:
- `src/app/(website-pages)/customize/page.tsx`
- `src/app/(website-pages)/customize/CustomizeClient.tsx`
- `src/app/(website-pages)/customize/variant-map.ts`
- `scripts/update-variant-map.mjs`
- `src/app/(website-pages)/checkout/page.tsx`
- `src/components/checkout/ProductSelectionForm.tsx`
- `src/components/checkout/ProductSelectionFormLegacy.tsx`
- `src/app/(website-pages)/checkout-pages/buy-product*`

What matters here:
- `CustomizeClient.tsx` is the main complex preorder configurator
- product/catalog display is mostly hardcoded inside the client component
- hidden tiers and some URLs come from Supabase via `admin_actions`
- exact Shopify variant IDs are stored in `variant-map.ts`
- checkout is mostly done by redirecting to Shopify cart permalinks on `dreamplay-pianos.myshopify.com`

Important limitation:
- this repo **does not currently have Shopify Admin API integration**
- it uses Shopify storefront/cart URLs, not synced order/account data

### 5. Auth and account flows
Supabase auth helpers:
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `src/app/api/auth/callback/route.ts`

Auth/account routes:
- `src/app/(website-pages)/login/page.tsx`
- `src/app/(website-pages)/register/page.tsx`
- `src/app/(website-pages)/activate/page.tsx`
- `src/app/(website-pages)/forgot-password/page.tsx`
- `src/app/(website-pages)/reset-password/page.tsx`
- `src/app/(website-pages)/vip/page.tsx`
- `src/app/(website-pages)/my-reservation/page.tsx`

How the account split works today:
- all users authenticate with Supabase auth
- non-buyer logged-in users land on `/vip`
- buyer emails are checked against Supabase table `buyer_emails`
- buyers are redirected from `/vip` to `/my-reservation`

### 6. Buyer portal / reservation decisions
Main buyer portal files:
- `src/app/(website-pages)/my-reservation/page.tsx`
- `src/app/(website-pages)/my-reservation/ReservationDecisionModule.tsx`
- `src/app/(website-pages)/my-reservation/ReservationPageClient.tsx`
- `src/actions/reservation-actions.ts`

What exists already:
- buyer-only route gate based on Supabase auth + buyer email allowlist
- static production timeline UI
- three decision choices:
  - `refund_requested`
  - `keep_reservation`
  - `upgrade_to_pro`
- persistence into Supabase table `reservation_decisions`
- email notifications via Resend to team + buyer confirmation email

Important limitation:
- the portal currently records the customer’s **decision**, but it does **not** load real Shopify order status or real synced order data
- there is no visible Shopify order pull, no live order-status API, and no local order-import hookup inside this repo
- `order_metadata` is optional metadata attached to the decision save, not a true order system

### 7. API routes and backend behavior
Main API routes:
- `src/app/api/chat/route.ts`
- `src/app/api/chatbot-models/route.ts`
- `src/app/api/chat-session/route.ts`
- `src/app/api/chat-suggestions/route.ts`
- `src/app/api/popup-ab/route.ts`
- `src/app/api/subscribe/route.ts`
- `src/app/api/track-ab/route.ts`
- `src/app/api/waitlist/route.ts`

Main server actions:
- `src/actions/admin-actions.ts`
- `src/actions/email-actions.ts`
- `src/actions/reservation-actions.ts`
- `src/actions/faq-actions.ts`

The repo uses a mix of:
- server actions for admin/config/email/reservation behavior
- API routes for chatbot, lead capture, A/B tracking, and waitlist/newsletter flows

## External systems used by this repo

### Supabase
Supabase appears to be the main backend for:
- auth/session handling
- buyer allowlist
- reservation decision storage
- admin variables / feature toggles
- analytics logs
- A/B test data
- chatbot session/message storage
- lead records in legacy tables like `Customer` and `Waitlist`

Tables inferred from code include:
- `admin_variables`
- `buyer_emails`
- `reservation_decisions`
- `chat_sessions`
- `chat_messages`
- `analytics_logs`
- `ab_tests`
- `ab_variants`
- `ab_events`
- `Customer`
- `Waitlist`

Important note:
- I did **not** find schema or migration files in the repo during this pass, so the DB contract is currently inferred from application code

### Shopify
Shopify is currently used for:
- cart/add or cart/clear preorder redirects
- variant-ID based checkout links

I did **not** find code for:
- Shopify Admin API client
- Shopify webhook ingestion
- order sync jobs
- customer account sync from Shopify
- canonical order-status retrieval from Shopify

### Resend
Resend is used for:
- buyer decision notifications and confirmations
- contact-form notifications
- some newsletter/welcome style sends

### External email webhook
`src/actions/email-actions.ts` sends newsletter subscriptions to:
- `https://email.dreamplaypianos.com/api/webhooks/subscribe`

So not all email/list logic lives inside this repo.

### AI providers
Chatbot model support is driven by:
- Google models
- Anthropic models

Files:
- `src/app/api/chat/route.ts`
- `src/app/api/chatbot-models/route.ts`
- `src/components/chatbot/system-prompt.ts`

## Pricing source of truth

Canonical pricing doc:
- `docs/PRICING.md`

This file explicitly says it is the canonical source of truth and should be updated before code references.

Important rules from that doc:
- DreamPlay One sale / market price: `$999`
- DreamPlay Premium Bundle retail price: `$1,099`
- DreamPlay One Pro sale / market price: `$1,899`
- Founder's Upgrade Fee: `$200`
- buyer portal uses sale price
- checkout uses sale price as actual charge and MSRP as strike-through
- marketing pages use MSRP as compare-at / value framing

## Strategy source of truth

Primary planning doc:
- `dreamplay-website-strategy-and-implementation-plan.md`

Current repo-level strategic themes from that doc:
- existing customer portal updates
- public announcement of DreamPlay Pro
- keep DreamPlay One as the core product
- make DreamPlay Pro feel additive and premium, not like a replacement
- preserve current real-route content unless explicitly changing it

## Key implementation observations

### Customer portal reality today
The customer portal already has a buyer-routing skeleton and a decision capture system, but it is still missing the actual order/account integration layer Lionel described.

Concretely, this means:
- auth exists
- buyer gating exists
- reservation choice persistence exists
- real order-status loading does **not** exist yet
- Shopify integration for orders/accounts does **not** exist yet

### The customize flow is a major control center
`src/app/(website-pages)/customize/CustomizeClient.tsx` is one of the most important files in the repo.
It currently combines:
- funnel UI
- static product catalog data
- pricing display
- countdown behavior
- auth checks
- save-my-build behavior
- Shopify redirect construction
- some urgency and conversion mechanics

This file is likely a high-risk edit surface for pricing, preorder, or product-ladder changes.

### There are multiple parallel/legacy buying flows
The repo contains more than one path for purchasing:
- `/customize`
- `/checkout`
- older `checkout-pages/buy-product*`
- `ProductSelectionFormLegacy.tsx`

So before changing checkout behavior, verify which route the live journey is actually sending traffic to.

### Admin/config behavior exists, but obvious admin UI was not found
`src/actions/admin-actions.ts` exposes many admin-style settings backed by `admin_variables`, including:
- countdown date
- discount popup status
- customize URLs
- hidden products
- chatbot model and knowledge

But during this pass I did **not** find a visible `src/app/admin/*` UI implementation.

## Important constraints for future work

- Use `docs/PRICING.md` as the canonical pricing source.
- Keep DreamPlay One and DreamPlay One Pro clearly distinct.
- Aztec Gold and Nightmare Black are Pro-only finishes.
- Do not assume the current repo has live Shopify order/account plumbing, because it does not appear to.
- Do not assume historical order totals in external datasets equal current website price sheet.
- If building real buyer order status, plan for a new integration/data layer rather than assuming it already exists in this repo.

## Best starting points by task type

### If the task is homepage / product positioning
Start with:
- `src/app/(website-pages)/premium-offer/page.tsx`
- `src/app/(website-pages)/dreamplay-pro/page.tsx`
- `src/components/premium-offer/*`
- `src/components/extended-offer/*`

### If the task is pricing consistency
Start with:
- `docs/PRICING.md`
- `src/app/(website-pages)/product-information/page.tsx`
- `src/app/(website-pages)/checkout/page.tsx`
- `src/app/(website-pages)/my-reservation/ReservationDecisionModule.tsx`
- `src/components/extended-offer/pricing-section.tsx`
- `src/config/journeys.ts`

### If the task is buyer portal / order status
Start with:
- `src/app/(website-pages)/my-reservation/page.tsx`
- `src/actions/reservation-actions.ts`
- `src/app/(website-pages)/vip/page.tsx`
- Supabase auth helpers in `src/lib/supabase/*`

And assume additional work will be needed for:
- real order source integration
- buyer account provisioning logic
- mapping order records to logged-in users

### If the task is checkout / Shopify linking
Start with:
- `src/app/(website-pages)/customize/CustomizeClient.tsx`
- `src/app/(website-pages)/checkout/page.tsx`
- `src/app/(website-pages)/customize/variant-map.ts`
- `scripts/update-variant-map.mjs`

## Short version

If I need to remember this repo quickly later:
- it is a Next.js marketing + preorder + lightweight buyer portal site
- middleware controls homepage/checkout journey routing
- Supabase is the real backend for auth, admin variables, analytics, chatbot, and buyer decision storage
- Shopify is currently used only as a redirect-based checkout target, not as a synced order backend
- `/my-reservation` already exists, but it is a decision portal, not a real order-status portal yet
- `docs/PRICING.md` is the canonical pricing truth
