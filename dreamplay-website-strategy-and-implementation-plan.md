# DreamPlay Website Strategy + Implementation Plan

> **For repo agent:** implement this in the website repo. Prioritize speed, clarity, and momentum. Preserve current real-route content unless explicitly noted. Make changes in a way that is easy to review and revert.

## Primary goal
Update the website to support two urgent needs:

1. **Existing customer portal updates**
   - logged-in buyers must be able to see the updated shipping timeline
   - logged-in buyers must be able to choose one of the 3 options:
     - full refund
     - keep reservation
     - upgrade to DreamPlay Pro for $200 more

2. **Public announcement of DreamPlay Pro**
   - surface DreamPlay Pro on the homepage
   - surface DreamPlay Pro on the customize page
   - make the product ladder clearer without making the homepage feel like it has abandoned DreamPlay One

---

## Product strategy

### Positioning
Use this framing consistently:
- **DreamPlay One** = the core instrument
- **DreamPlay Pro** = the premium expression

### Product naming / visuals
- DreamPlay Pro premium finishes:
  - **Aztec Gold**
  - **Nightmare Black**
- Nightmare Black uses black keys plus dark gray / black “white” keys
- DreamPlay One uses normal black-and-white keys

### Messaging goals
The site should communicate:
- DreamPlay is expanding upward, not replacing the original product
- existing customers are protected and have clear choices
- DreamPlay Pro is premium, aspirational, and clearly more elevated
- DreamPlay One remains the core entry point

### What to avoid
Do **not** make it feel like:
- the original product has been replaced
- customers are being forced into Pro
- the homepage has become mostly about the premium tier

---

# Part 1 — Existing Customer Portal

## Goal
Inside the logged-in buyer experience, show a clear update and let customers select one of the 3 next steps.

## Required content
Logged-in customers should see:

### A. Reservation update block
Include:
- original delivery expectation is no longer realistic
- revised target delivery: **Q4 2026**
- concise explanation that building a new keyboard from scratch has taken longer than expected
- tone should be transparent, calm, founder-led, and premium

### B. Updated pricing context
Show clearly:
- **DreamPlay One: $999**
- **DreamPlay Pro: $1,899**

Do **not** expose prior customer-specific historical pricing bands in a way that lets customers compare what others paid.

### C. Three-option decision module
Customers should be able to choose exactly one:

#### Option 1 — Cancel for a full refund
Copy should make clear:
- full refund
- no questions asked

#### Option 2 — Keep reservation
Copy should make clear:
- reservation stays active
- DreamPlay One ships when ready
- revised timeline is Q4 2026

#### Option 3 — Upgrade to DreamPlay Pro for $200 more
Copy should make clear:
- flat **$200 more than what the customer already paid**
- keep wording simple even if historical customer payments vary
- this is a loyalty upgrade path for early supporters
- show visuals for Aztec Gold and Nightmare Black if feasible

## UX recommendations

### Best layout
Use a 3-card decision layout:
- one card per option
- each card has title, short explanation, and CTA button
- one option can be selected and confirmed

### Suggested account page sections
1. reservation status / timeline update
2. product/pricing context
3. three-option selector
4. confirmation state / next steps

### Recommended CTA labels
- `Request Full Refund`
- `Keep My Reservation`
- `Upgrade to DreamPlay Pro`

## Functional requirements

### Persist customer choice
When the user submits, save a structured choice value such as:
- `refund_requested`
- `keep_reservation`
- `upgrade_to_pro`

### Capture metadata
Also store:
- selected_at timestamp
- user/account/customer id
- current reservation/product metadata if useful

### Confirmation state
After choosing, show a clear confirmation message.
Examples:
- refund request received
- reservation remains active
- Pro upgrade request received

### Admin visibility
If there is an admin/support dashboard, make the choice visible there so support can act on it.

## Suggested implementation tasks

### Task 1 — identify the logged-in account page route and data source
Find:
- where buyers log in
- where reservation/order/account data is loaded
- where customer-specific actions are currently submitted

### Task 2 — add customer-decision data model
Add whatever minimal schema/state is needed for:
- reservation decision
- selected option
- timestamps

### Task 3 — add reservation update UI block
Implement the Q4 2026 update section with premium/founder tone.

### Task 4 — add 3-option action cards
Implement the actual selectable options and submit actions.

### Task 5 — connect to backend persistence
Wire option selection into the appropriate backend route/action/API.

### Task 6 — add confirmation and review state
Make sure the account page reflects the user’s current selected option.

### Task 7 — verify end-to-end
Confirm a buyer can:
- log in
- see the timeline update
- choose one option
- save it
- reload the page and still see the recorded choice

---

# Part 2 — Homepage: announce DreamPlay Pro

## Goal
Add DreamPlay Pro to the homepage in a way that feels premium and additive, without overpowering the core DreamPlay One story.

## Homepage strategy
Do **not** rebuild the homepage around Pro.
Instead:
- keep the homepage anchored in the core DreamPlay mission
- add a premium block introducing DreamPlay Pro
- let users click deeper

## Recommended homepage content block
Add a section below the core DreamPlay One story and before the final conversion area.

### Suggested section structure
**Eyebrow:**
- `Introducing DreamPlay Pro`

**Headline:**
- `A more elevated expression of DreamPlay.`

**Body copy:**
Use something close to:
> For pianists who want the most premium version of the DreamPlay vision, DreamPlay Pro introduces elevated finishes and a more distinctive visual identity — including Aztec Gold and Nightmare Black.

**CTA options:**
- `Explore DreamPlay Pro`
- `Customize Your DreamPlay`

## Visual recommendations
Use:
- Aztec Gold image
- Nightmare Black image

Best presentation:
- two-up side-by-side visual block
- or one hero image with smaller secondary image

## What homepage copy should accomplish
- signal that DreamPlay Pro now exists
- make the product ladder feel more premium
- increase aspiration and perceived brand value
- avoid making DreamPlay One feel downgraded

---

# Part 3 — Customize Page: clearly introduce DreamPlay Pro

## Goal
The customize page should make the DreamPlay One / DreamPlay Pro distinction obvious, because this is closer to conversion intent.

## Recommended page structure

### A. Product-tier selector early in the flow
Near the top of the customize experience, add a clear tier choice:
- DreamPlay One
- DreamPlay Pro

This can be:
- segmented control
- two side-by-side cards
- two-tier intro step before size/color selection

### B. Product comparison block
Show a simple comparison:

#### DreamPlay One
- $999
- core DreamPlay experience
- standard black/white key appearance
- primary model for most buyers

#### DreamPlay Pro
- $1,899
- premium DreamPlay tier
- premium finishes:
  - Aztec Gold
  - Nightmare Black
- more elevated visual identity

### C. Pro-specific finish presentation
If user selects Pro, show finish cards for:
- Aztec Gold
- Nightmare Black

Nightmare Black should visually communicate the darker all-black / dark-gray key aesthetic.

## Important product UX rule
Do **not** hide DreamPlay One behind Pro.
The customize page should make the upgrade path clear, but the One path should still feel primary and easy.

## Suggested implementation tasks

### Task 1 — inspect current customize flow structure
Find:
- route/component for `/customize`
- current step logic
- current product/size/color selection logic

### Task 2 — add product-tier state
Add a field or UI state for:
- `dreamplay_one`
- `dreamplay_pro`

### Task 3 — render tier selector
Implement a clean tier-selection UI before downstream customization.

### Task 4 — add DreamPlay Pro comparison copy
Add the minimal comparison block and pricing.

### Task 5 — add Pro finish cards
Render Aztec Gold and Nightmare Black when Pro is selected.

### Task 6 — propagate selection through reserve/customize flow
Ensure selected tier affects:
- displayed pricing
- displayed images
- summary state
- checkout/reservation data if applicable

### Task 7 — verify user flow
Confirm:
- One flow still works
- Pro flow works
- visuals and pricing update correctly
- selected tier is preserved through navigation

---

# Content recommendations

## Homepage block draft
**Eyebrow:**
Introducing DreamPlay Pro

**Headline:**
A more elevated expression of DreamPlay.

**Body:**
For pianists who want the most premium version of the DreamPlay vision, DreamPlay Pro introduces elevated finishes and a more distinctive visual identity, including Aztec Gold and Nightmare Black.

**CTA:**
Explore DreamPlay Pro

## Customize page tier copy draft
### DreamPlay One
The core DreamPlay instrument — designed for pianists who want a better-fitting keyboard and a clear path into the DreamPlay ecosystem.

### DreamPlay Pro
Our premium DreamPlay tier — with elevated finishes, a more distinctive visual identity, and a more aspirational expression of the product.

---

# Implementation guidance

## Priority order
1. existing customer portal choices
2. customize page Pro announcement / tier selector
3. homepage Pro announcement block

## Why this order
- customer account flow is operationally urgent
- customize page is closest to conversion
- homepage can follow once the product architecture is clear

## Verification checklist
Before considering this complete, verify:
- logged-in buyers can see Q4 2026 update
- logged-in buyers can choose 1 of 3 options
- those choices persist correctly
- DreamPlay Pro appears on homepage without overpowering DreamPlay One
- DreamPlay Pro appears clearly on customize page
- One vs Pro pricing is correct
- Aztec Gold and Nightmare Black visuals display correctly
- no accidental regressions to the existing homepage/customize flow

---

# Deliverable expectation
Please implement this as a focused, reviewable set of changes.

If needed, ship in two passes:
- **Pass 1:** existing customer portal option selection
- **Pass 2:** homepage + customize page Pro announcement

Do not overbuild. Keep it practical, premium, and easy to review.
