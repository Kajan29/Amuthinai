# Donor Dashboard

For restaurants, caterers, event halls and households that have surplus food to give away.
The donor posts food, answers recipients' requests, follows the delivery live, and earns karma
points.

[← Back to dashboards overview](README.md)

---

## Navigation

**Bottom tabs**

| Tab | Opens |
| --- | --- |
| Home | Main donor dashboard |
| Donations | Full list of everything the donor has posted |
| Map | Map of the donor's pickup locations |
| Impact | Karma points, tier, rank and points history |
| Profile | Account settings, language, password |

**Side menu** (hamburger icon): the donor's name with "Verified Donor • {karma} KP", links to
the same five screens, **Post Surplus Food Donation**, and **Logout**.

**Screens opened from other screens**: the Post Donation form (3 steps + success page) and the
Donation Details / Tracking page.

---

## 1. Home

### Greeting and status

- "Vanakkam, {first name} 👋"
- "{count} Active Contributions in {hub}" — how many donations are still in progress.
- **Verified Donor** badge if the account has been verified.

### Impact stats (three cards)

| Card | What it shows |
| --- | --- |
| Meals shared | Total servings the donor has given |
| Families fed | Number of recipients helped |
| Karma pts | Current karma point balance |

### "Your action needed" cards

Appear only when the donor must do something themselves — when the admin chose
**Recipient self-pickup** or **Donor self-delivery**. The card says which one, and tapping it
opens the donation so the donor can confirm the handover with the recipient's code.

### Who needs food

A horizontal row of open food requests from recipients nearby, with a count such as
"3 families waiting". Each card shows:

- Recipient's first initial and name
- "{count} meals needed"
- Area / location
- "Needed by {time}"
- An orange **Urgent** tag when the need is pressing
- A **Help** button

Tapping a card opens a **Fulfill this request** sheet with the recipient's details (servings
needed, family size, needed-by time, notes, dietary requirements, area). The sheet reminds the
donor that "An admin confirms the final method after approval." Pressing **Answer this request**
opens the donation form already linked to that request, with the servings filled in.

If no one is waiting: "No one is waiting — When someone asks for food, tap their card to help."

### My donations list

Three filter tabs, each with a count:

| Tab | Shows |
| --- | --- |
| All Donations | Everything |
| In Transit | Assigned, Collected and On the way |
| History | Delivered, Rejected, Expired and Cancelled |

Each donation card shows:

- Food photo (or a placeholder icon) with the quantity, e.g. "30 pkts"
- Title, pickup area and cooking time
- Who it is for: "Recipient: {name}", "For a request", "Waiting for a recipient to claim", or
  "General donation"
- Coloured status chip (Pending Approval, Approved, Assigned, …)
- A "Safe for {time}" countdown while the food is still live
- The confirmed delivery method (Volunteer delivery / Recipient self-pickup / Donor
  self-delivery)
- When delivered: "Delivered to {place}" and "+{points} Karma"
- When a volunteer is on the way: "Volunteer {name} is {minutes} mins away" with a **TRACK**
  button
- When the donor must confirm a handover: "Confirm handover"
- When riders are being contacted: "{count} riders pinged"
- Urgent donations get an orange border

Pull down to refresh. Tapping a card opens [Donation details](#5-donation-details--live-tracking).

### Main button

At the bottom: **Post a general donation**. If the donor saved an unfinished form, it reads
**Continue draft** instead.

---

## 2. Posting a donation (3-step form)

A progress bar at the top shows: Food Details → Logistics → Review. The donor can go back,
close the form, or save a draft at any time. If the donor came from a recipient's request, a
banner shows "Answering {name}'s request" with an option to post it as a general donation
instead.

### Step 1 — Food Details

| Field | Options / rules |
| --- | --- |
| Food category (required) | Cooked Meals, Fresh Produce, Bakery & Roti, Dry Goods, Dairy, Beverages |
| Donation title (required) | At least 3 letters, e.g. "Veg biryani, 30 packets" |
| Quantity (required) | Plus/minus counter from 1 to 5,000, or quick buttons 10 / 20 / 30 / 50 |
| Unit type | Packets / Boxes, Kilograms, Pieces, Litres, Portions |
| Dietary & preparation tags | Pure Vegetarian, Halal Friendly, Cooked Today (<2 hrs), Nut-Free, Contains Egg/Meat |
| Description & food safety note | Free text, up to 300 characters |
| "Standard food safety verified" | Tick box |
| Photos | Up to 3, from camera or gallery. The first photo is the cover image |

Buttons: **Save Draft** (keeps everything so the donor can continue later from Home) and
**Continue to Step 2 →** (enabled once the title and quantity are filled).

### Step 2 — Logistics & Timing ("Schedule Food Pickup")

**Pickup location (required)**

- **Use Registered Address** — the address on the donor's profile, with GPS coordinates.
- **Enter a Different Pickup Address** — for event halls, catering centres or pop-up stalls.
  Street and landmark, city, entrance/floor, plus **Use my current location** to pin the GPS
  point.

**Freshness & pickup window**

| Field | Rules |
| --- | --- |
| Prepared / cooked at (required) | Cannot be in the future. Must be within the safe window for that food type (e.g. 6 hours for cooked meals) |
| Ready from | When the food can be collected |
| Consume before | Must be later than the pickup time. **Locked** for cooked meals — set automatically to 6 hours after cooking |

Times are picked with an hour / minute (15-minute steps) / AM-PM picker. The screen shows
"Food safe consumption window {time} remaining upon collection", and an **Urgent Window** label
when 2 hours or less are left. Cooked food shows a reminder that it stays safe for 6 hours.

**Storage & handling instructions** (multi-select): Keep Warm, Requires Refrigeration,
Individually Packed Containers, Fragile / Liquid (Curry).

**Preferred delivery method**

| Option | Meaning |
| --- | --- |
| Volunteer delivery (Recommended) | A verified volunteer collects from the donor and delivers to the recipient |
| Recipient self-pickup | The recipient comes to collect; the donor checks the recipient's code |
| Donor self-delivery | The donor takes the food to the recipient; the recipient's code confirms the handover |

This is only a preference — "An admin confirms the final method after approval."

**Special handover instructions** (optional, up to 150 characters), e.g. "Ring bell at side
gate, ask for Kajan."

Buttons: **← Back** and **Continue to Step 3 →** (enabled only when the timing is valid and a
pickup address is set).

### Step 3 — Verify & Confirm

- **Attached photos** — tap to preview, remove, or add more (up to 3).
- **Estimated impact** — "{people} people fed · ~{kg} kg CO₂ waste saved".
- A warning with an **Edit** link if something is missing (no title, or an invalid cooking
  time).
- **Summary** — food type & quantity, dietary badges, packaging, prepared at, expiry window
  (with time left), pickup location and note, fulfilment preference. An **Edit** button jumps
  back to step 1.
- **Food Safety & Hygiene Pledge** (must be ticked): "I confirm this surplus food is freshly
  prepared, hygienic, safe for human consumption, and strictly complies with community food
  standards."
- **Confirm & Post** — sends the donation to the admin team with status **Pending Approval**.

### Success page — "Donation Posted Successfully!"

- **Reference code**, e.g. `#KP-2026-4F2A`, and a meals label such as "30 Hot Meals".
- **Current status** (Matching Volunteer Rider / Rider on the way / Self-drop arranged /
  Delivered), **Estimated pickup** time, and **Assigned area**.
- Karma card: "+50 Karma Points" marked **On delivery** (or **Earned** once credited), plus the
  donor's level:

  | Level | Name | Karma needed |
  | --- | --- | --- |
  | 1 | New Kitchen Partner | 0 |
  | 2 | Community Helper | 200 |
  | 3 | Trusted Donor | 750 |
  | 4 | Jaffna Community Champion | 2,000 |

- **Track Live Pickup Status** and **Return to Home Dashboard** buttons.
- Share buttons for WhatsApp, Story and the phone's share menu, with a ready-made message
  including the meals, area and reference code.

---

## 3. Donations tab

The complete list of the donor's donations using the same cards as Home, without the filters.
Pull down to refresh. Tap any card to open its details.

---

## 4. Map tab

Shows a pin at the pickup location of each of the donor's donations, centred on Jaffna. Tapping
a pin shows the title and area; tapping the pop-up opens the donation details. On the web
version a static map with numbered pins (up to 9) is shown instead.

---

## 5. Donation details & live tracking

The top card shows the title, status badge, servings and food type, a live **safe-to-eat
countdown**, a progress bar through the delivery stages, and the rejection reason if the admin
rejected it.

The page has three tabs.

### Track

- **Map** with the pickup point (donor), the volunteer, and the recipient drop-off, connected
  by a route line.
- **Status message** over the map, for example:
  - "Matching a volunteer rider…"
  - "Volunteer is {minutes} mins away from pickup"
  - "Food collected — heading to the recipient"
  - "En route to recipient • ~{minutes} mins"
  - "Delivered successfully"
- **How it reaches the recipient** — the confirmed delivery method, or "Delivery method not
  chosen yet".
- **Recipient details** card (name, servings, family size, needed by, notes, dietary needs,
  area, phone) — or "Waiting for a recipient to claim" for general donations.
- **Handover panel** (only for recipient self-pickup or donor self-delivery):
  - For donor self-delivery: **I'm on my way** button to tell the recipient the donor has set
    off.
  - A box to type the recipient's **4-digit code**, then **Verify code & mark delivered**.
  - Once confirmed: "Handover confirmed — The donation is marked delivered and your points have
    been added."
- **Volunteer card** (for volunteer delivery): name, verified tick, vehicle type, route distance,
  and a **Call** button.
- **Pickup PIN** — "Give this PIN to the volunteer. The rider must enter this 4-digit PIN when
  collecting the food."
- **Route summary** — pickup address, volunteer location, recipient drop-off.
- **Pickup & delivery photos** uploaded by the volunteer, with a ✓ when the PIN was verified.

The page refreshes itself every 15–20 seconds.

### Status

A timeline of every status change with date and time. The history is tamper-proof: each entry
is chained to the one before it, so it cannot be silently edited.

### Messages

An in-app chat about this donation between the people involved (donor, volunteer, admin).

---

## 6. Impact tab

- Large **karma points balance**.
- **Tier** badge and **Rank #** among all users.
- **Points history** — each award with its reason, points and date. If empty: "Points are
  awarded once a donation is delivered."

Works offline using the last loaded data.

### How donors earn karma

| Event | Points |
| --- | --- |
| First ever donation | +100 |
| Each donation delivered | +50 |
| Bonus for delivering it personally | +20 |

---

## 7. Profile tab

The shared profile screen — see [Profile](README.md#profile) in the overview.

---

## Known limitations

- On the tracking map, the volunteer's position is an **estimate** based on the delivery stage
  (and the location of the last proof photo), not live GPS from the volunteer's phone.
- The "{count} riders pinged" and "minutes away" values depend on the server's estimate, not
  real-time rider tracking.
