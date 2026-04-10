# DreamPlay Website Repo — Execution Prompt

Implement the following changes quickly and cleanly in the website repo.

## Priorities
1. logged-in buyer portal update + 3-option selection flow
2. customize page support for DreamPlay Pro
3. homepage section announcing DreamPlay Pro

Do not overbuild. Keep changes practical, premium, and easy to review.

---

## Part 1 — Logged-in buyer portal

### Goal
Existing DreamPlay buyers need to log in and see:
- updated delivery target: **Q4 2026**
- a concise explanation that building from scratch has taken longer than expected
- their 3 options:
  1. full refund
  2. keep reservation
  3. upgrade to DreamPlay Pro for **$200 more**

### Important business rules
- keep wording simple
- do not reveal old customer price bands in a way that lets buyers compare what others paid
- DreamPlay One price = **$999**
- DreamPlay Pro price = **$1,899**
- DreamPlay Pro finishes:
  - **Aztec Gold**
  - **Nightmare Black**
- Nightmare Black uses dark gray/black “white” keys and black black keys

### Required UX
On the logged-in account/order/reservation page:
- add a reservation update section
- add a 3-card choice UI
- allow customer to submit exactly one option
- persist the choice
- show confirmation state after save

### Suggested values to persist
- `refund_requested`
- `keep_reservation`
- `upgrade_to_pro`

Also persist:
- customer id
- timestamp
- any relevant reservation id/order id

### CTA labels
- `Request Full Refund`
- `Keep My Reservation`
- `Upgrade to DreamPlay Pro`

### Deliverable
A logged-in buyer can:
- log in
- see the update
- pick one of the three options
- save it
- reload and still see the saved state

---

## Part 2 — Customize page

### Goal
The customize page should clearly support both:
- **DreamPlay One**
- **DreamPlay Pro**

### Requirements
Add a product-tier selector near the top of the customize flow:
- DreamPlay One
- DreamPlay Pro

When selected:
- pricing updates correctly
- imagery updates correctly
- summary/selection state updates correctly

### Product ladder
#### DreamPlay One
- $999
- core DreamPlay instrument
- normal black-and-white key appearance

#### DreamPlay Pro
- $1,899
- premium DreamPlay tier
- premium finishes:
  - Aztec Gold
  - Nightmare Black

### Pro-specific UI
If Pro is selected, show finish options/cards for:
- Aztec Gold
- Nightmare Black

### Important UX rule
Do not make DreamPlay One feel hidden or secondary in a bad way.
The flow should make Pro available, but One should still feel like the core path.

### Deliverable
A user can:
- choose One or Pro
- see correct pricing
- see correct visual treatment
- move through the customize flow with the tier preserved

---

## Part 3 — Homepage

### Goal
Announce DreamPlay Pro on the homepage without replacing the existing DreamPlay One story.

### Requirements
Add a premium section to the homepage introducing DreamPlay Pro.
Do not rebuild the homepage around Pro.

### Suggested copy direction
**Eyebrow:**
Introducing DreamPlay Pro

**Headline:**
A more elevated expression of DreamPlay.

**Body:**
For pianists who want the most premium version of the DreamPlay vision, DreamPlay Pro introduces elevated finishes and a more distinctive visual identity, including Aztec Gold and Nightmare Black.

### Visuals
Use premium DreamPlay Pro imagery:
- Aztec Gold
- Nightmare Black

### CTA
Use something like:
- `Explore DreamPlay Pro`
- or `Customize Your DreamPlay`

### Deliverable
Homepage now clearly signals that DreamPlay Pro exists, but DreamPlay One remains the core story.

---

## Implementation guidance

### Suggested order
1. inspect account portal / logged-in buyer flow
2. implement buyer decision persistence
3. add logged-in buyer update UI
4. inspect customize flow structure
5. add tier selector + pricing + imagery handling
6. add homepage DreamPlay Pro section
7. verify all flows end-to-end

### Verification checklist
- buyer can log in and choose 1 of 3 options
- selected option persists correctly
- DreamPlay One = $999
- DreamPlay Pro = $1,899
- Pro finishes displayed correctly
- customize flow works for both One and Pro
- homepage announces Pro cleanly
- no regression to existing homepage/customize behavior

### Important constraint
Keep this implementation focused and reviewable.
If needed, split into:
- Pass 1: buyer portal choice flow
- Pass 2: customize + homepage Pro updates
