# Admin Dashboard

For hub operations staff. Admins keep the whole system safe and moving: they review every
donation, verify volunteers, decide how food reaches each recipient, assign riders, watch live
deliveries, resolve complaints and read impact reports.

[← Back to dashboards overview](README.md)

---

## Navigation

**Bottom tabs**

| Tab | Opens |
| --- | --- |
| Home | Operations overview and task queue |
| Approvals | Approvals & Verification hub |
| Deliveries | Live delivery monitor |
| Analytics | Reports & Analytics |
| Profile | Hub settings, language, account |

**Side menu** ("Amuthinai Operations Hub", shown with the admin's name):

1. Dashboard
2. Approvals & Queues
3. Volunteer Approvals
4. Active Deliveries
5. Recipient Food Requests
6. Central Live Map
7. Reports & Analytics
8. Disputes & Concerns
9. Hub Settings
10. Sign Out of Hub

The header subtitle reads "JAFFNA CENTRAL HUB • OPERATIONS".

---

## 1. Home — Operations overview

### Top counters

| Counter | Shows | Tapping it opens |
| --- | --- | --- |
| Approvals | Donations waiting for review | Approvals |
| Dispatched | Deliveries currently in progress | Deliveries |
| Volunteers | Total volunteers | Volunteer Approvals |
| Urgent | Donations close to expiry | Filters the task list to Urgent |

### Task queue

Search: "Search donations, volunteers, aid…"

Filter pills: **All Tasks**, **Donations**, **Volunteers**, **Recipients**, **Urgent**, each
with a count.

The queue combines four kinds of work:

| Item | Card shows | Button |
| --- | --- | --- |
| Donation waiting for review | Time left, packaging / safety check status | **Review** |
| Volunteer waiting for verification | "Pending KYC", identity documents status | **Verify** |
| Open recipient request | Open / Matched, needed-by time | **Match** |
| Live delivery | Status or "Delayed", courier name | **Monitor** |

Urgent cards (less than 90 minutes of safe time left, or a delayed delivery) are highlighted.
When the queue is empty: "No matching tasks — New donations, KYC and requests will appear
here."

### Jaffna Live Operations Map

A preview map with layer buttons **ALL / HUBS / DONATIONS / ROUTES / DEMAND** and a legend
(Hubs, Donations, Active Routes, High Demand). Tapping it opens the full live map.

### Food distribution overview

Total Donations, Pending Approvals, Active Deliveries, Completed Distributions, Available
Volunteers, Unresolved Concerns, **Unmet Demand** (servings still needed — opens Recipients),
and **Active Pickups** (opens Deliveries). Link: **Open Approvals →**.

Pull down to refresh.

---

## 2. Approvals & Verification

- "Pending Review" badge with the total number of items waiting.
- **High Priority** banner: "{N} High Priority Items — Meals close to expiry threshold" (less
  than 2 hours left). **Review Next →** opens the most urgent donation.

### Verification queues

| Queue | Purpose | Button |
| --- | --- | --- |
| Donation Approvals | Food safety review of new donations | Open Donations Queue |
| Volunteer KYC & Approvals | Identity and vehicle checks for new volunteers | Open Volunteers Queue |
| Recipient Aid Requests | Open food requests from recipients | Open Recipients Queue |
| Karma Rewards Claims | Shows that karma is "Auto-credited on delivery" | Audit & Release Points → |

### Recent donations in queue

Each donation shows a photo, time left, servings and food type, and safety-check status, with a
**Review →** button. Empty: "No donations waiting".

---

## 3. Reviewing a donation

What the admin sees:

- Status and short ID (e.g. `#4F2A9C`)
- Title, donor name, preparation time, time remaining, servings, units and packaging
- Fresh / Expired badge, progress bar and safe-time pill
- Recipient details — or "No recipient yet" for a general donation
- The donor's **preferred delivery method** ("Donor prefers: …")
- Inspection photos (tap to zoom)
- **Quality & Safety checklist**: Thermal Safety, Food-Grade Packaging, Dietary & Allergen
  Tags, Pickup Bay Verified, Point of Contact (with a **Call** button for the donor)

### Actions while the donation is Pending Approval

**Approve & Dispatch**

- Status becomes **Approved** and the donor is notified.
- If a recipient is already linked, they are told their food was approved, and the admin is
  prompted to **Choose delivery method**.
- If no recipient is linked, the donation becomes open for recipients to claim.
- If 90 minutes or less are left, urgent "quick collection" alerts go to admins and nearby
  volunteers.

**Flag / Reject**

- A reason is required (at least 5 characters).
- Status becomes **Rejected** and the donor is notified with the reason.

When the donation is already Approved, the page shows **Choose delivery method**.

---

## 4. Choose delivery method & assign a volunteer

Three numbered sections. If the donation is not approved yet, a notice asks the admin to
approve it first.

### Section 1 — Recipient

- If a recipient is linked, their details are shown.
- If not, nearby open requests (within about 25 km) are listed, each with **Set aside for this
  recipient**. The recipient is notified that food has been found. The admin can also wait for
  a recipient to claim it.

### Section 2 — Delivery method

| Method | What happens when confirmed |
| --- | --- |
| Volunteer delivery | The admin picks a volunteer in section 3 |
| Recipient self-pickup | Confirmed immediately. The recipient gets a 4-digit code to show the donor; the donor is told to enter it |
| Donor self-delivery | Confirmed immediately. Same code process; the donor takes the food to the recipient |

The donor's preferred method is marked "Donor prefers". After confirming a self-pickup or
self-delivery: "Handover codes were sent to the donor and recipient."

### Section 3 — Pick a volunteer

Verified volunteers within 50 km of the pickup are listed with a status:

| Status | Meaning | Can be assigned? |
| --- | --- | --- |
| Available | On duty, within their travel radius, no active tasks | Yes |
| Busy · {N} active | On duty, within radius, already carrying tasks | Yes |
| Off duty | "Ready for Deliveries" is switched off | No |
| Outside travel radius | Pickup is farther than the volunteer's chosen radius | No |

**How volunteers are ranked** (auto-match):

- 50% — how close they are to the pickup
- 30% — whether their vehicle can carry the number of servings
- 20% — how few active tasks they already have

The top volunteer is labelled **Best Match ({score}%)**. Each card also shows "~{N} min to
pickup", "Carries {N} servings" or "Vehicle may be too small", and "{N} deliveries" completed.

**Assign & notify volunteer** sends the task as an offer. The donation becomes **Assigned**.
When the volunteer accepts, the donor receives the pickup PIN and the recipient receives the
delivery PIN.

If no volunteer is suitable, a partner NGO can be assigned instead (**Assign to {NGO} →**).

### Reassigning a courier

Allowed while the food has not been collected yet. The current volunteer's task is cancelled,
they are notified, and the new volunteer gets the offer. Reassign is available from this screen
and from the Deliveries screen.

---

## 5. Volunteer Approvals

Filter tabs: **Pending**, **Approved**, **Flagged**.

Each volunteer card shows avatar, name, badge (Verified Rider / Ready for Review), vehicle, NIC
/ licence / documents status, number of previous deliveries, application date, and **Review &
Approve**.

- Tick several volunteers and use **Approve Selected Volunteers (N)** for batch approval, with
  Select All / Deselect All.
- **Review** pop-up: NIC, vehicle and capacity, travel radius ("X km from Jaffna Base"), phone.
  - **Approve & Onboard** — the volunteer becomes verified and can claim tasks.
  - **Flag** — marks the volunteer for follow-up ("Needs secondary document clarification").

Unverified volunteers cannot accept open tasks.

---

## 6. Deliveries — live monitor

**Counters**: Dispatched, Delayed, On-Time %, Average route km.

**Filters**: ALL, IN TRANSIT, PICKED UP, DELAYED, DELIVERED.

Each delivery card shows title, servings, route km, PIN, status, delay reason if any, pickup and
drop-off points, the volunteer, and **Timeline & Proof →**.

The list includes all live deliveries plus deliveries completed in the last 24 hours.

**Automatic delay alerts**:

| Alert | When |
| --- | --- |
| Volunteer has not accepted yet | Offer waiting more than 30 minutes |
| Pickup delayed | Accepted more than 60 minutes ago but not collected |
| Delivery delayed | Collected more than 90 minutes ago but not delivered |
| Close to expiry / past safe window | Little or no safe time left |

**Delivery Status & Timeline** (pop-up): the stages of the trip, proof photos (or "Awaiting
recipient PIN confirmation"), **Call Courier**, and **Reassign**.

---

## 7. Disputes & Concerns

"Recipient & Community Concerns" raised by recipients and volunteers.

Filters: **ALL**, **OPEN**, **RESOLVED**.

Each card shows the subject, who sent it and which donation it is about, status, message and
date.

- **Open** concerns have a resolution box (at least 5 characters) and **Submit & Notify
  Recipient**.
- **Resolved** concerns show the "Official Admin Resolution".

The person who raised the concern gets a notification: "Your concern was resolved".

Concern statuses: Open → In Review → Resolved.

---

## 8. Recipient Food Requests

Filters: **ALL**, **OPEN**, **MATCHED**, **FULFILLED**.

Each request card shows:

- Priority: **EMERGENCY DEMAND** if needed within 3 hours, high priority within 8 hours
- Meal category, recipient name, portions, notes, address, needed-by time
- Family size and contact preference
- Status, with **Match with Donation →** or **View Delivery Route →**

Linking a donation to a request is done from the delivery method screen
([section 4](#section-1--recipient)).

---

## 9. Reports & Analytics

**Main figures**

| Card | Meaning |
| --- | --- |
| Meals Distributed | Total servings delivered |
| Food Waste Averted | Kilograms of food saved (0.4 kg per serving) and CO₂ equivalent (×2.5) |
| Households Fed | Families helped, plus number of relief hubs |
| Completed Deliveries | Finished deliveries, plus how many are active now |

**Charts and lists**

- **Food Waste Reduction** — kilograms saved each month (last 6 months)
- **Surplus Food Donations by Category** — percentage and count per food type
- **Top Volunteer Couriers** — top 5 by deliveries, with their karma

Period buttons: THIS MONTH / QUARTERLY / ALL TIME. An Export button is also available.

---

## 10. Central Live Map

A map of the Jaffna area with layers:

| Layer | Shows |
| --- | --- |
| HUBS | Partner NGOs |
| DONATIONS | Up to 50 current donations |
| ROUTES | Lines from pickup to drop-off for active deliveries |
| DEMAND | Circles where many people are requesting food |

Tapping an item opens an inspector: **Inspect Food Safety** for a donation, **View Hub
Logistics** for a hub.

---

## 11. Hub Settings (Profile tab)

- The shared profile screen (see [Profile](README.md#profile)).
- Shortcuts: Live operations map, Analytics, Disputes.
- **Dispatch controls**:
  - Auto-match volunteers — "Rank nearby volunteers by distance and capacity"
  - Urgent freshness alerts — "Notify when food is close to expiry"

---

## 12. What the system does automatically

**Freshness check (every 15 minutes)**

- **90 minutes or less left**: alerts the donor and assigned volunteer. If the donation still
  needs review, admins are told to "review now". If nobody is carrying it yet, admins and
  available volunteers within 15 km get a quick-collection alert.
- **Safe window closed**: the donation is marked **Expired** ("Safe consumption window
  closed"), open tasks for it are closed, and the donor is notified. Food that has already been
  collected is not expired.
- **Stuck deliveries**: admins get "Delivery delayed" alerts using the same 30 / 60 / 90 minute
  rules as the Deliveries screen.

**Audit trail**

Every status change is saved in a tamper-proof history. Each entry is linked to the one before
it with a security hash, so past records cannot be quietly changed.

**Notifications admins receive**

New concerns, new food requests, donations near expiry, delivery delays, volunteer declines on
offered tasks, and new claims on general donations.

---

## Known limitations

- **Karma Rewards Claims**: the queue always shows 0, and "Release 750 Karma Credits" only shows
  a message — karma is already automatic.
- **Volunteer Approvals**: the filter counts (5 / 28 / 2) are fixed numbers, the search icon
  only shows a hint, and "Export Verification Report" does not create a file.
- **Analytics**: the THIS MONTH / QUARTERLY / ALL TIME buttons do not change the data, and
  Export does not create a file. The server also calculates demand by district and unfulfilled
  requests by area, but these are not shown yet.
- **Deliveries timeline**: the times and the "72°C Thermal Check Passed" line in the timeline
  pop-up are sample values.
- **Recipient requests**: "Confirm Match & Dispatch" only tells the admin to use the approvals
  queue; matching is done on the delivery method screen.
- **Donation review**: the checklist always shows "5/5 Checks Ready", and the Flag / Reject
  button always rejects (the separate "flag" action is not reachable).
- **Hub Settings**: the Auto-match and Urgent alerts switches are not saved. Ranking and expiry
  alerts always run on the server.
- **Live map**: hub "volunteers on site" is always 0, and courier positions are route end
  points, not live GPS.
- **Disputes**: the success message mentions SMS, but the recipient is actually notified by push
  and in-app notification.
- **Volunteer verification**: if approval fails, the app may still show a success message.
