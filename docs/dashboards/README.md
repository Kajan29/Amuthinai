# Amuthinai — Dashboards Guide

Amuthinai is a surplus-food redistribution app for the Jaffna region. Restaurants, homes and
event halls post leftover food. Volunteers carry it to families who need it. Hub admins check
everything in between so the food is safe and reaches the right person.

The app has four role dashboards. Each user sees only the dashboard for the role they signed
up with.

| Dashboard | Who uses it | What they mainly do | Guide |
| --- | --- | --- | --- |
| Donor | Restaurants, caterers, households | Post surplus food, answer food requests, track deliveries, earn karma | [Donor dashboard](donor-dashboard.md) |
| Volunteer | Riders with a bicycle, motorbike, car, etc. | Accept nearby delivery tasks, prove pickup and delivery with photo + PIN | [Volunteer dashboard](volunteer-dashboard.md) |
| Recipient | Families and individuals in need | Request food, claim open donations, track delivery, raise concerns | [Recipient dashboard](recipient-dashboard.md) |
| Admin | Hub operations staff | Approve donations, verify volunteers, choose delivery method, assign riders, resolve disputes, view analytics | [Admin dashboard](admin-dashboard.md) |

---

## How one donation moves through the app

1. **Donor posts food** — fills a 3-step form (food details, pickup and timing, review) and
   signs a food safety pledge.
2. **Admin reviews it** — looks at photos, timing and packaging, then approves or rejects it
   with a reason.
3. **A recipient is linked** — in one of three ways:
   - the donor posted it as an answer to a specific recipient's request,
   - a recipient claims the general donation first ("first come, first served"), or
   - the admin sets it aside for a nearby open request.
4. **Admin confirms the delivery method** — volunteer delivery, recipient self-pickup or donor
   self-delivery.
5. **Handover happens** — confirmed with 4-digit codes so the food only changes hands with
   the right person:
   - *Volunteer delivery:* the volunteer enters the donor's pickup PIN, then the recipient's
     delivery PIN, and uploads a photo at each step.
   - *Recipient self-pickup / donor self-delivery:* the donor types in the recipient's code.
6. **Delivered** — status becomes Delivered, karma points are awarded, and the recipient's
   request is marked fulfilled.

### Donation statuses

| Status shown in app | Meaning |
| --- | --- |
| Pending Approval | Posted by the donor, waiting for admin review |
| Approved | Passed review; waiting for a recipient and/or delivery arrangement |
| Rejected | Admin did not approve it (reason is shown to the donor) |
| Assigned | Delivery method fixed and a volunteer (or the donor/recipient) is responsible |
| Collected | Food has been picked up from the donor |
| On the way | Food is travelling to the recipient |
| Delivered | Handover code verified — finished |
| Expired | The safe-to-eat window ran out before delivery |
| Cancelled | Stopped before delivery |

### Food safety windows

Every donation has a "safe to eat" window. The app counts down the time left and marks food
**Urgent** when 90 minutes or less remain. When the window closes, the system automatically
marks the donation Expired (checked every 15 minutes).

| Food type | Maximum safe window |
| --- | --- |
| Cooked meals | 6 hours from cooking time |
| Dairy | 12 hours |
| Beverages | 12 hours |
| Fresh produce | 24 hours |
| Bakery & roti | 24 hours |
| Dry / packaged goods | 72 hours |

### Karma points

| Event | Points | Who gets them |
| --- | --- | --- |
| First ever donation | +100 | Donor |
| Donation delivered | +50 | Donor |
| Donor delivered the food personally | +20 bonus | Donor |
| Delivery completed with verified PIN | +30 | Volunteer |

Points are added automatically when a delivery is confirmed. Each event is only counted once.

---

## Features shared by every dashboard

### Signing in

- **Log in** with email and password, or **Continue with Google**.
- **Create account**: full name, email, phone, password, and a role (Food Donor, Volunteer or
  Recipient). Admin accounts are not created from the app.
- **Email verification** with a one-time code (OTP) sent by email.
- **Forgot password**: a reset code is emailed, then the user sets a new password.
- After login the app opens the dashboard that matches the user's role automatically.
- Demo builds include a one-tap "Advanced Login" for each role using the seeded test accounts.

### Profile

Every role has a Profile screen with:

- Name, email, role badge and **Verified / Pending verification** status.
- Karma points and "Member since" date.
- **Edit profile** — name, phone, address, city, district (email cannot be changed).
- **Change password** — current password, new password (at least 8 characters), confirm.
- **Language** — English, Tamil (தமிழ்) or Sinhala (සිංහල). The whole app switches language.
- **Sign out** (with a confirmation prompt).

### Notifications

- Push notifications and an in-app **Notifications** inbox showing unread count, a
  "Mark all read" button, and tapping a notification opens the related screen.
- Examples: donation approved or rejected, new task offered, handover code sent, food is close
  to expiry, delivery delayed, concern resolved.

### Offline support

The last loaded data (for example the volunteer's nearby tasks and karma) is saved on the
phone. If the network drops, the app keeps showing that data instead of a blank screen.
