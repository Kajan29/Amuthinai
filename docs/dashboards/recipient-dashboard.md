# Recipient Dashboard

For families and individuals who need food. The recipient can request a meal, claim a general
donation that is still available, follow the delivery, share a handover code at the door, and
raise a concern if something goes wrong.

[← Back to dashboards overview](README.md)

---

## Navigation

**Bottom tabs**

| Tab | Opens |
| --- | --- |
| Home | Main recipient dashboard |
| Requests | "My Food Requests" — current and past requests |
| Map | Distribution Hubs (partner NGOs) |
| Impact | Community impact figures |
| Profile | Account settings, language, password |

**Side menu** (hamburger icon): Home, Post Request, My Requests, Hub Map, Community Impact,
Profile, Raise Concern, and Logout.

**Screens opened from other screens**: the Request Food form (3 steps + success page) and
Raise a Concern.

---

## Request statuses

| Status | What it means for the recipient |
| --- | --- |
| Open — "Waiting for a donor" | The request is visible to nearby donors; nobody has answered yet |
| Matched | A donation has been linked. From here the app shows the donation's own stage (Pending Approval, Approved, Assigned, Collected, On the way) |
| Fulfilled — "Delivered" | The food was handed over and the code was verified |
| Cancelled | The request was cancelled |

A recipient can have **only one active request** (open or matched) at a time.

---

## 1. Home

### Greeting

"Vanakkam" and "வணக்கம், {name}!"

### Stats (three columns)

| Stat | What it shows |
| --- | --- |
| Active Needs | Number of the recipient's open or matched requests |
| Nearby Hubs | Active partner NGOs within 15 km |
| Meals Shared | Total servings the recipient has received |

### Main activity card

The large card changes with the situation:

| Situation | Card shows | Button |
| --- | --- | --- |
| Active request | "CURRENT ACTIVITY", "LIVE TRACKING", "Delivery of N Portions In Progress", drop-off area, needed-by time, current status | **View Food & Delivery Details** |
| Only past requests | "PAST ACTIVITY", "Delivered & Completed" or "Past Request (Cancelled)" | **View Past Delivery Details** and **New Request** |
| No requests | "No Active Requests" | **Post a Food Request** |

**Food & delivery details** (pop-up): order number, portions, city, status, the delivery card
(see [Tracking a delivery](#4-tracking-a-delivery)), food and portion details, relief hub
details, and a **Track Delivery on Live Map** button.

**Track Food Delivery** (pop-up): a map with the route, estimated arrival time, a Call button
for the volunteer, and the recipient's handover code.

### Food you can claim

"General donations near you. The first eligible recipient to claim receives it."

A horizontal row of approved general donations, soonest-to-expire first. Each card shows a
photo, "{servings} ready", the title, "From {donor} · {km} km away", a safe-time pill, and
**Claim this food**. **View All ›** opens the Requests tab.

If nothing is available: "No food to claim right now".

### Immediate assistance banner

"Post a Meal Request for Family" — opens the Request Food form.

---

## 2. Requesting food (3-step form)

### Step 1 — Location

- Search a place in Jaffna, or tap a quick chip (Nallur, Chunnakam, etc.).
- **Locate me** uses the phone's GPS. The recipient can also tap or drag on the map to set the
  "Delivery Destination Point".
- The point must be **inside Jaffna District**. Outside it, an alert appears and the next
  button is disabled.
- If there are other active requests within 1 km, a privacy notice appears (other people's
  identities are never shown) with a **Call Relief Coordinator** button.
- Nearby partner hubs are listed so the recipient can pick the closest one.

Buttons: **Back** and **Confirm Hub & Proceed**.

### Step 2 — Food Details

| Field | Options |
| --- | --- |
| Meal category | Cooked Hot Meals, Raw Groceries, Bakery Food, Dry Ration Care Pack |
| Number of people | 1 to 50, with quick buttons 1, 3, 5, 10, 20, 30, 50 |
| Dietary preference | Pure Vegetarian, Non-Vegetarian, Halal Certified Meals, Diabetic / Low Spice Food |
| Delivery method | Volunteer Doorstep Delivery, or Self Pickup at Community Hub |
| Contact preference | Phone call, SMS, WhatsApp, In-app messages |

Button: **Proceed to Review**.

### Step 3 — Review

- A summary of location and hub, number of people and meal category, dietary preference,
  delivery method and contact preference.
- **Special Delivery Instructions** (optional).
- A note that nearby volunteers and donors will be alerted and the request can be tracked from
  Home.
- **Submit Food Request**.

The "needed by" time is set automatically to 4 hours from now. Once submitted, admins and
nearby donors are notified. If the recipient already has an active request, an error explains
that the existing one must be finished or cancelled first.

### Success page

"Request received" — the app will match the request with a nearby donation and notify the
recipient when a volunteer is on the way. Button: **My request** (back to Home).

---

## 3. Claiming a general donation

Tapping **Claim this food** opens a sheet:

- "Open to eligible recipients — the first to claim it receives it."
- **How many servings do you need?** — counter from 1 up to the donation's size.
- **Deliver to** — the address on the recipient's profile.
- **Note for the admin** (optional).
- **Reserve {count} servings**.

Rules:

- Only one recipient can claim a donation. If someone else claimed it first: "Someone else
  claimed this food first."
- A recipient with an active request cannot claim more food until that request is finished or
  cancelled.
- A successful claim creates a matched request for the recipient and notifies the donor and
  admins.

Success: "Food reserved for you — Only you can receive this donation now. You'll be told how it
will reach you after the admin review."

---

## 4. Tracking a delivery

Once a request is matched, the delivery card shows:

- **Donation progress** bar and current status (Pending Approval → Approved → Assigned →
  Collected → On the way → Delivered).
- Safe-to-eat time left while the food is on its way.
- **How it reaches the recipient**:
  - Volunteer delivery
  - Recipient self-pickup — "Collect from" the donor's address
  - Donor self-delivery — "The donor will bring the food to you"
  - or "Delivery method not chosen yet — An admin confirms the final method after approval."
- **Your handover code** — the 4-digit code:
  - Self-pickup: "Show this code to the donor when you collect the food."
  - Donor delivery: "Share this code with the donor only when you receive the food."
  - Volunteer delivery: "Share this code with the volunteer only when the food reaches you."
  - Before the delivery is confirmed: "Your code appears here once the delivery is confirmed."
    For volunteer delivery the code appears only after a volunteer accepts the task.
- **Call** the volunteer or donor (whichever is bringing or handing over the food).
- Footer: "Marked delivered only after the correct code is verified."

The Requests screen refreshes a matched request's tracking every 20 seconds.

---

## 5. My Food Requests

**Tabs**: **Current Requests** (open and matched) and **Past Requests** (fulfilled and
cancelled), each with a count.

Each card shows servings, a status badge, address, needed-by or "Delivered on" date, notes, and
"Tap to view details, tracking & concerns".

**Request details** (pop-up):

- Status banner, food and portion details, the delivery card.
- **Track Delivery on Map**.
- **Raise a Concern** about this request.
- Only while the request is still **Open**:
  - **Edit Details** — change portions (1–15) and notes.
  - **Cancel Request** — with a confirmation.

A matched request cannot be cancelled from the app; the recipient is asked to raise a concern
instead.

Empty states: "No Current Requests" with **Request Food Now**, and "No Past Requests". A
floating **New Request** button and pull-to-refresh are always available.

---

## 6. Distribution Hubs (Map tab)

"Distribution Hubs — Jaffna District Relief Network ({N} Active Hubs)"

- Map view or list view, with search.
- Filters: All Hubs, Nearby (< 3 km), High Stock (30+ Packs), Open Today.
- Hubs are the active partner NGOs, sorted by distance.
- Each hub has **Request Meals / Request Food Delivery** (opens the Request Food form),
  **Directions**, and **Call**.
- Buttons to centre on the recipient's location or on Jaffna district.

---

## 7. Community Impact

A screen of community-wide figures: Meals Delivered, CO₂ Emissions Saved, Families Supported,
and Hubs Across Jaffna Region, plus a "Direct Food Dignity" message.

---

## 8. Raise a Concern

Opened from the side menu, the Profile screen, or a request's details.

1. **Select a request** — current or past (optional).
2. **Issue type** — Food not arrived, Delivery delay, Wrong quantity, Food quality issue, Other
   issue.
3. **Details** — a description of the problem.
4. **Submit Concern to Administration**.

The concern goes to the admin's **Disputes** screen and admins are notified. When an admin
resolves it, the recipient gets a notification with the resolution.

---

## 9. Profile

The shared profile screen (see [Profile](README.md#profile)). The saved address is used as the
delivery location when claiming food. There is an extra **Raise a concern** link.

---

## Known limitations

- The Community Impact numbers are fixed sample figures, not live data.
- On Home, the stats show sample numbers (2, 4, 18) if the server has not returned values yet.
- Hero card pictures are stock photos, not photos of the actual donation.
- On the tracking maps, the volunteer and hub positions are approximate, not live GPS.
- The hub coordinator phone number (+94 21 222 4589) is fixed in the app.
- Hub "meals available" is always 0, so the **High Stock** filter shows nothing.
- Choosing a hub in the request form or from the Hub map is not sent with the request.
- The "needed by" time cannot be chosen; it is always 4 hours after submitting.
- The concern issue type is included in the message text but not stored as a separate category.
