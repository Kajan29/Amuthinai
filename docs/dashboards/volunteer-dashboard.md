# Volunteer Dashboard

For riders who collect surplus food from donors and deliver it to recipients. The volunteer
turns on availability, accepts nearby tasks, proves pickup and delivery with a photo and a
4-digit PIN, and earns karma points.

[← Back to dashboards overview](README.md)

---

## Navigation

**Bottom tabs**

| Tab | Opens |
| --- | --- |
| Home | Nearby tasks and the "Ready for Deliveries" switch |
| Tasks | All tasks with filters (urgent, active, done) |
| Map | Map of nearby task pickup points |
| Impact | Karma, levels, achievements and leaderboard |
| Profile | Account, vehicle and travel radius settings |

**Side menu** (hamburger icon): name with "Active Volunteer • {karma} KP", Home Dashboard,
Available Tasks, Hub Map & Routes, Community Impact, Volunteer Profile, **Food Safety
Guidelines**, Raise Concern / Report Issue, and Logout.

The Food Safety Guidelines pop-up reminds volunteers to keep containers above 60°C or below
5°C, use tamper-proof seals, and verify donor and recipient identity.

**Screens opened from other screens**: Task Details, Pickup Verification, Delivery Handover,
and Raise Concern.

---

## Before a volunteer can take tasks

1. **Admin verification** — a new volunteer shows as "Pending verification". An admin must
   approve them (identity and vehicle check) before they can claim open tasks.
2. **Vehicle and travel radius** — set on the Profile tab.
3. **Ready for Deliveries** — must be switched on at Home. When it is off, no new tasks are
   shown (the volunteer still sees tasks they already accepted).

---

## 1. Home

### Search

"Search tasks by area, shelter, food type…" — filters the task list by title, food type, or
pickup / drop-off address.

### Map card with "Ready for Deliveries" switch

- A small map of the volunteer's area with pins for open tasks.
- **Ready for Deliveries** switch:
  - On: "{count} tasks nearby"
  - Off: "Turn on Ready for Deliveries to receive tasks."
- Expanding the card opens the Map tab.

### Active task banner

Shown when the volunteer has accepted a task that is not finished yet:

- "ACTIVE TASK IN PROGRESS" with the donation title — "Tap to resume route navigation →".
- "Road Obstacle or Delay? Raise Concern for this Order" — opens Raise Concern linked to this
  task.

### Volunteer Dispatch & Concern Desk

A shortcut strip: "Report road obstacles, current or past delivery issues".

### Active Community Requests (open task cards)

Each card shows:

- Urgency label:
  - "Urgent Pickup • {N} mins left" — 90 minutes or less of safe time left
  - "Scheduled • {time}" — food is ready later
  - "Standard Drop • Before {time}" — normal task
- "+30 Karma pts"
- Food type (Cooked, Bakery, Produce, Packed, Dairy, Drinks) and title
- Pickup address with distance away, drop-off address with ride distance (or "Recipient matched
  on acceptance")
- "{servings} servings • Est. {minutes} min ride"
- **Accept Task** (or **Accept Delivery Ride** for urgent ones) — opens Task Details

Empty states include "You are paused" (switch is off), "No tasks match your search" and "No
open tasks nearby right now".

The list refreshes automatically every 60 seconds.

---

## 2. Tasks

"Delivery Tasks" — a full list combining current and past tasks.

**Filter tabs** (with counts): All Tasks, Urgent, Active, Done.

Tasks are sorted with active ones first, then urgent, then nearest. Completed tasks are at the
bottom.

Each card shows urgency (e.g. "Urgent · 45m left"), Active / Completed badge, "+30 Karma pts",
title, servings and food type, pickup and drop-off, distance and time, a **Safe to eat**
countdown bar, and a button:

- **Accept Task** — for open tasks
- **Continue Delivery** — for a task in progress
- **Delivered & Verified** — for finished tasks

Every card also has "Raise Concern / Report Delay". Pull down to refresh.

---

## 3. Map

- The volunteer's location and a circle showing their **travel radius** (default 10 km).
- A pin at each task's pickup point:
  - Red — urgent
  - Green — available
  - Orange — the volunteer's active task
- A legend with counts for Urgent, Available and Active.
- Tapping a pin opens a card with the title, servings, distance, ETA, +30 points, pickup and
  drop-off, and **View Task Details**.

---

## 4. The delivery flow

### Step 1 — Task Details

A progress bar shows Route → Pickup → Delivered.

- **Status banner**: Open • Available to Claim / Offered to You / Assigned to You / Picked Up •
  In Transit / Delivered & Verified, plus the food's ready and expiry times.
- **Food card**: title, food type (Hot Food, Fresh Produce, …), servings, packaging and handling
  notes.
- **Pickup donor**: the donor's name and phone are hidden ("Shown after you accept") until the
  volunteer accepts. Then Call and SMS buttons work.
- **Instructions** from the donor.
- **Transit path**: route map from pickup (A) to drop-off (B), total km and ETA, and the
  recipient's details when matched.
- **Pre-ride gear & bag inspection**: an optional photo of the delivery bag.

Main button, depending on stage:

| Stage | Button |
| --- | --- |
| Open or offered | **Accept Task & Start Ride →** |
| Accepted, not yet collected | **Start Ride to Pickup Point →** |
| Collected | **Continue to Drop-off →** |
| Finished | **Delivery Completed ✓** |

**Decline**: asks "Decline this task? It will be offered to other volunteers." with **Keep it**
or **Decline**. Declined tasks no longer show for that volunteer, and admins are told if it was
a task they had offered directly.

**Need Support / Report Delay** opens Raise Concern.

When a task is accepted:

- The donor receives the **pickup PIN**.
- The recipient receives the **delivery PIN**.
- The donor's and recipient's contact details become visible to the volunteer.

### Step 2 — Pickup Verification

Progress: Route ✓ → Verification → Delivery.

- **Pickup location** with GPS status — "Arrived & GPS Location Verified" when within 0.5 km,
  otherwise the distance remaining (tap to refresh).
- **Food safety & inspection checklist** (all three must be ticked):
  1. Food temperature verified
  2. Quantity matches listing
  3. Sealed hygienic containers
- **Container photo proof** (required): **Take Live Photo** or **From Gallery**. The capture
  time is shown.
- **Secure donor handover PIN**: the 4-digit PIN the donor gives the volunteer. A **Call donor**
  button helps if the PIN is missing.
- **Confirm Pickup & Start Delivery →** — enabled when the checklist, photo, PIN and location
  are all in place.

The server checks that the PIN matches and the food has not expired, saves the photo, location
and time, and moves the donation to **Collected** and then **On the way**.

### Step 3 — Delivery Handover

- **Destination card**: "Arrived at Drop-off", distance or "En route", the recipient's name,
  and Call / WhatsApp / SMS buttons depending on how the recipient prefers to be contacted.
- **Proof of handover**: a photo (camera or gallery) and the **recipient's 4-digit delivery
  PIN**.
- **Community impact**: number of servings delivered and "+30 Karma Points on completion".
- **Complete Task & Return →** — the server checks the recipient's PIN, marks the donation
  **Delivered**, closes the task, marks the recipient's request fulfilled, and awards points.

Success message: "Delivery Complete!" with servings delivered and +30 karma, then back to Home.
**View Route Receipt** shows a summary of the trip.

---

## 5. Impact

"My Impact — Track your volunteer journey"

- **Karma balance**, tier badge, **Rank #** among all users, and a progress bar to the next
  tier.
- **Stats**: Deliveries, People Fed (total servings delivered), CO₂ Saved.
- **Level progression**:

  | Tier | Karma needed |
  | --- | --- |
  | Bronze Helper | 0 |
  | Silver Volunteer | 500 |
  | Gold Champion | 1,500 |
  | Platinum Guardian | 3,500 |
  | Diamond Legend | 7,000 |

- **Achievements**: First Delivery (1 delivery), Speed Runner (5 in one day), 10 Streak (10 days
  in a row), Community Star (50 deliveries), Heavy Lifter (500+ servings), Legend (100
  deliveries).
- **Top Volunteers**: the top 5 leaderboard, with the current user marked "(You)".
- **Recent Activity**: the last 5 karma awards with reason, date and points.

Each verified delivery earns **+30 karma**.

---

## 6. Profile

The shared profile screen (see [Profile](README.md#profile)) plus volunteer settings:

- **Quick stats**: karma points, deliveries, current tier and progress.
- **Level & Progression System** — the same five tiers as Impact.
- **Volunteer Achievements**: First Mile Hero, Rapid Responder (task done within 20 minutes of
  accepting), Community Champion (250 servings), Century Rescuer (100 deliveries), Zero Waste
  Legend (2,500 karma).
- **Vehicle**: Foot, Bicycle, Motorbike, Three-wheeler, Car, Van. Admins use it to judge how
  much food the volunteer can carry:

  | Vehicle | Carries about |
  | --- | --- |
  | Foot | 10 servings |
  | Bicycle | 20 servings |
  | Motorbike | 40 servings |
  | Three-wheeler | 80 servings |
  | Car | 120 servings |
  | Van | 400 servings |

- **Travel radius**: 2, 5, 10, 15 or 25 km. Only tasks inside this distance are shown.
- **Submit** saves the vehicle and radius ("Settings saved").
- Menu links: Delivery history (Tasks), Community impact (Impact), Raise a concern.

---

## 7. Raise Concern ("Volunteer Support")

Two tabs: **Raise Concern** and **Submitted Logs**. There is also an emergency hotline button.

**Raising a concern**

1. **Link to an order** — choose a current or past task, or "General Volunteer Inquiry / Issue".
2. **Issue category** — for example damaged food or a vehicle breakdown / delay. Each category
   has a suggested urgency.
3. **Urgency** — Normal, Moderate, Critical, Urgent.
4. **Details** — at least 10 characters.
5. **Photo** — optional.
6. **Reporting as** — the volunteer's name and phone are attached automatically.
7. **Submit Concern to Administration**.

Confirmation: "Concern Dispatched", with options to view concerns or go back to tasks. The
concern appears in the admin's Disputes screen.

**Submitted Logs** shows each concern with its status (Pending Dispatch, In Review, Resolved)
and the admin's replies or resolution.

---

## Known limitations

- The 0.5 km "arrived" GPS check at pickup is a guide only — it does not block confirming the
  pickup.
- The pickup checklist and the pre-ride bag photo are checked on the phone but not saved to the
  server.
- Declining a task does not ask for a reason (the server records "Not suitable").
- The filter and search buttons on the Tasks screen, and the search / filter / re-centre
  buttons on the Map screen, do not do anything yet.
- The "You" and "D1" labels on the Home map card are decorative, not live positions.
- There is no limit on how many tasks a volunteer can accept at once.
- The hotline button on Raise Concern dials 119 (police), not a dedicated dispatch number.
- The achievements on the Impact tab and the Profile tab use different lists, and both are
  calculated on the phone rather than stored on the server.
