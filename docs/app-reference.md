# Warshety (Garage) — App Reference Document

> **What this document is:** A ground-truth reference reverse-engineered entirely from the live codebase.
> Every function name, field name, constant, error message, validation rule, and status is taken
> directly from the source code — not from plans or old PRDs.
>
> **Last verified:** July 2026
> **Scope:** Customer-facing app. Vendor/admin/branch-manager surfaces are noted as "website only"
> and documented only where they intersect with what the customer sees.

---

## Table of Contents

1. [Current Feature Status](#1-current-feature-status)
2. [Route Tree](#2-route-tree)
3. [Authentication](#3-authentication)
4. [My Garage — Vehicle Profiles](#4-my-garage--vehicle-profiles)
5. [Service Discovery](#5-service-discovery)
6. [Availability & Slot Engine](#6-availability--slot-engine)
7. [Booking — Creation](#7-booking--creation)
8. [Booking — Lifecycle & State Machine](#8-booking--lifecycle--state-machine)
9. [Booking — Reschedule & Cancellation](#9-booking--reschedule--cancellation)
10. [Reviews & Ratings](#10-reviews--ratings)
11. [Loyalty Rewards & Points](#11-loyalty-rewards--points)
12. [Notifications](#12-notifications)
13. [Profile & Account](#13-profile--account)

---

## 1. Current Feature Status

| Feature                           | Status      | Notes                                          |
| --------------------------------- | ----------- | ---------------------------------------------- |
| Service center search & discovery | ✅ **Live** | Full filtering, sorting, map, reviews          |
| My Garage (vehicles)              | ✅ **Live** | Add / edit / delete — only 4 fields used in UI |
| Booking creation                  | ✅ **Live** | 2 booking types with type-specific validation  |
| Booking tracking (live timeline)  | ✅ **Live** | 9-state machine, immutable history             |
| Reschedule & cancellation         | ✅ **Live** | 2-hour lock, non-cancellable states            |
| Reviews & ratings                 | ✅ **Live** | Verified-buyer gated, vendor reply             |
| Loyalty rewards / points          | ✅ **Live** | Earn per booking, redeem for QR vouchers       |
| Blog (static articles)            | ✅ **Live** | JSON-driven, read-only                         |
| Profile management                | ✅ **Live** | Name, phone, avatar                            |

---

## 2. Route Tree

### Customer routes (live)

```
/{lang}/                          Home
/{lang}/services                  Service center list + search
/{lang}/services/[slug]           Service center profile + booking sidebar
/{lang}/bookings                  My bookings list
/{lang}/bookings/[id]             Booking detail + live status timeline
/{lang}/garage                    My Garage (vehicles)
/{lang}/profile                   Profile edit
/{lang}/rewards                   Rewards dashboard (points balance, catalog, vouchers)
/{lang}/reward/use                QR / code validation landing (no auth required)
/{lang}/search                    Global search
/{lang}/blog                      Blog articles
/{lang}/about                     About
/{lang}/legal                     Legal pages
/{lang}/auth/login
/{lang}/auth/register
/{lang}/auth/forgot-password
/{lang}/auth/reset-password
/{lang}/auth/callback
```

### Website-only routes (vendor / admin — NOT in app scope)

```
/{lang}/vendor/apply
/{lang}/vendor/dashboard
/{lang}/vendor/bookings
/{lang}/vendor/calendar
/{lang}/vendor/services
/{lang}/vendor/reviews
/{lang}/vendor/billing
/{lang}/vendor/customers
/{lang}/vendor/settings
/{lang}/vendor/branches
/{lang}/branch/[branchId]   (branch manager view)
/{lang}/admin/*             (15+ admin pages)
```

---

## 3. Authentication

### Login methods

1. **Email + password** — `supabase.auth.signInWithPassword`. Returns special marker
   `"__email_not_confirmed__"` when email is unconfirmed so the UI can show the right message.
2. **Google OAuth** — `signInWithOAuth({ provider: 'google' })` → redirected to `/auth/callback`.

### Registration

- `supabase.auth.signUp` with metadata `{ full_name, role: 'customer' }`.
- DB trigger `on_auth_user_created → handle_new_user()` auto-creates the `public.users` profile row.
- Confirmation email is sent; user cannot log in until confirmed.

### Password reset

1. `POST /api/auth/forgot-password { email }` — always returns success (no email enumeration).
2. Server generates Supabase recovery link → sends branded Resend email.
3. Recovery link → `/auth/reset-password`. `GET /api/auth/set-session?access_token=&refresh_token=`
   exchanges tokens into a live session.
4. On failure (expired/invalid): redirects to `/auth/forgot-password?error=invalid_link` or `link_expired`.

### Session management

- Cookie-based SSR sessions via `@supabase/ssr`.
- Middleware refreshes the session on every request.
- Sign-out: `POST /api/auth/signout` clears cookies server-side + hard redirect.

### Role resolution (on login)

Three parallel Supabase queries fire immediately after `INITIAL_SESSION`:

1. `users` → `role`, `total_points`, profile fields.
2. `vendors` (only if `role = 'vendor'`) → vendor profile.
3. `branch_users` (only if `role = 'manager'`) → `branch_id`.

### Auth context value

```
session, user, vendor, role, vendorType, managedBranchId,
isLoading, isAuthenticated,
signIn(email, password), signUp(email, password, fullName),
signInWithGoogle(), signOut(), refreshProfile()
```

### Business rules

- Email confirmation is **enforced** — unconfirmed users cannot log in.
- Tokens stored in auth cookies only — never in localStorage.
- Role is read server-side from `users.role`; client guards are UX only.
- All authorization enforced by RLS; the client is never the sole gate.

---

## 4. My Garage — Vehicle Profiles

### Vehicle fields used in the UI

| Field   | DB column | Type | Required | Collected in UI              |
| ------- | --------- | ---- | -------- | ---------------------------- |
| Brand   | `make`    | text | ✅       | Dropdown from `car_makes`    |
| Model   | `model`   | text | ✅       | Dropdown from `car_models`   |
| Year    | `year`    | int  | ✅       | Dropdown 1996 – current year |
| Mileage | `mileage` | int  | ⬜       | Optional number input        |

### Car catalog tables

- **`car_makes`** — ~110+ makes. Fields used: `id`, `name` (display), `name_ar` (RTL display).
- **`car_models`** — 2400+ models linked by `make_id`. Fields used: `id`, `name` (display).

### Add/edit vehicle — quick flow (homepage VehicleFilterBar)

1. Select **Make** (dropdown, from `car_makes`).
2. Select **Model** (dropdown, from `car_models` filtered by make).
3. Select **Year** (last 30 years).
4. Press **"Book a Service"** → vehicle saved + activated → redirected to `/services`.

### Add/edit vehicle — full flow (Garage page dialog)

1. **Brand** — required dropdown.
2. **Model** — required dropdown (resets when brand changes).
3. **Year** — required dropdown 1996–current.
4. **Mileage** — optional number.
5. Save → if adding: vehicle auto-becomes active; if editing: updates in place.

### Garage page layout

1. **Header** — "My Garage" title + "+ Add Vehicle" button.
2. **Active vehicle switcher** — horizontal scrollable row; each chip shows "YEAR BRAND MODEL";
   active chip is highlighted + has green pulse dot.
3. **Vehicles grid** (1 col mobile, 2 col md+):
   - Per-brand color accent strip (e.g., Toyota = red, BMW = dark blue, Mercedes = slate).
   - Vehicle name + year.
   - "ACTIVE" green badge if active.
   - Mileage chip ("— km" if not set).
   - **Book Service** button → `/services`.
   - **Set as Active** button (only if not currently active).
   - Edit (pencil) + Delete (trash) icons.
4. **Empty state** — illustration + "Add Your First Vehicle" CTA.
5. **Quick tips** section — 3 info cards (smart filtering, service history, recall alerts).

### Persistence — guest vs. authenticated

| Aspect              | Guest                                                     | Authenticated                                                                |
| ------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Storage             | `localStorage` only                                       | Supabase `vehicles` + `localStorage` cache                                   |
| `localStorage` keys | `garage_vehicles` (JSON array), `garage_active_id` (UUID) | Same (used as instant cache)                                                 |
| Sync                | None                                                      | addVehicle / updateVehicle / removeVehicle write to Supabase async           |
| On login            | —                                                         | Fetches Supabase rows; restores active from localStorage, then first vehicle |

### Active vehicle concept

- Exactly one active vehicle at a time (or none).
- Drives the vehicle pre-fill in the booking sidebar.
- `compatibilityString` format: `"BRAND MODEL YEAR"` (e.g., "BMW 3 Series 2019") — shown in filter chips.
- Deleting the active vehicle clears the active selection (no auto-fallback to another vehicle).

### GarageContext exposed API

```
vehicles: Vehicle[]
activeVehicle: Vehicle | null
activeId: string | null
isHydrated: boolean
addVehicle(input)     → string (new id)
removeVehicle(id)
updateVehicle(id, updates)
setActiveVehicle(id)
clearActiveVehicle()
```

### useGarage hook extras (beyond context)

```
hasVehicles: boolean
vehicleCount: number
hasActiveVehicle: boolean
activeVehicleLabel: string | null     ("YEAR BRAND MODEL")
isActive(id): boolean
vehicleLabel(v): string
```

---

## 5. Service Discovery

### Entry points

- **By service name or center name** (toggle tabs) — searchable text input.
- **Service center directory** at `/{lang}/services`.
- **Individual center profile** at `/{lang}/services/[slug]` (slug can be a UUID or a text slug).
- **Global search** at `/{lang}/search`.

### Filter options (ServiceCentersClient)

| Filter          | How it works                                                       |
| --------------- | ------------------------------------------------------------------ |
| Governorate     | Dropdown, matches `vendors.governorate` or active branch locations |
| District        | Cascading from governorate; matches branch district                |
| Car make        | Matches `vendors.supported_makes[]`                                |
| My vehicle      | Uses active vehicle's brand/model/year to match `supported_makes`  |
| Available today | Checks if vendor has any open slot today                           |
| Top rated       | Shows only vendors with `rating ≥ 4.8`                             |
| Sort by rating  | Orders by `vendors.rating` DESC                                    |

### Visibility rules

- Vendors with `status = 'approved'` **and** `status = 'pending'` both appear in the customer
  directory. Pending vendors display a **"Pending Approval"** badge and are excluded from the
  "Available today" filter (`availableToday = false`). Only `approved` vendors pass that filter.
- Only `active = true` services appear on a vendor's profile.
- `rating` and `total_reviews` shown are the denormalized counters on the `vendors` row
  (recalculated automatically on every review insert).
- **Phone number is never displayed to customers** — it exists in the `vendors` table and is
  fetched server-side but is intentionally omitted from all customer-facing UI (listing cards,
  center profile page, and branch cards).

### Service center profile — data shown

| Section               | Data source                                                              |
| --------------------- | ------------------------------------------------------------------------ |
| Hero                  | `cover_image_url` (or gradient fallback)                                 |
| Name                  | `business_name` / `business_name_ar`                                     |
| Rating + review count | `vendors.rating`, `vendors.total_reviews`                                |
| Completed bookings    | `vendors.completed_bookings`                                             |
| Address + maps link   | `address`, `city`, `governorate`, `maps_link`                            |
| Email                 | `vendors.email` (shown only if set)                                      |
| Working hours         | `vendor_working_hours` (7 days)                                          |
| Branches              | `vendor_branches` (active branches only; name + address only — no phone) |
| Services list         | `services` where `active = true` and `vendor_id` matches                 |
| Reviews               | All `reviews` rows for vendor, with user name + vendor reply             |
| Booking sidebar       | Sticky right-column form (see §7)                                        |
| **Phone**             | **NOT shown.** `vendors.phone` is fetched but never rendered.            |

### Service card fields displayed

From `DbService`:

- `name` / `name_ar`
- `description` / `description_ar`
- `price` (EGP, or "Quote" if null)
- `duration_minutes` (shown as estimated time)

---

## 6. Availability & Slot Engine

### Inputs the engine reads

1. `vendor_working_hours` — one row per day of week.
2. `vendor_slot_settings` — interval + capacity (falls back to defaults if not configured).
3. `slot_overrides` — manual blocks/openings for specific dates and/or times.
4. Existing non-cancelled `bookings` for the target date.

### Default working hours (used when vendor has not configured hours)

| Day           | Open  | Close | Open? |
| ------------- | ----- | ----- | ----- |
| Sunday (0)    | 09:00 | 17:00 | ❌    |
| Monday (1)    | 08:00 | 20:00 | ✅    |
| Tuesday (2)   | 08:00 | 20:00 | ✅    |
| Wednesday (3) | 08:00 | 20:00 | ✅    |
| Thursday (4)  | 08:00 | 20:00 | ✅    |
| Friday (5)    | 09:00 | 17:00 | ✅    |
| Saturday (6)  | 09:00 | 14:00 | ✅    |

### Default slot settings

- `slot_interval_minutes`: **30** (allowed values: 15, 20, 30, 45, 60).
- `cars_per_slot`: **1** (range: 1 – 20).

### TimeSlot object structure

```typescript
{
  time: string;           // "HH:MM"
  available: boolean;
  reason?: "booked" | "past" | "closed" | "blocked" | "opened";
  isManualOverride?: boolean;   // true when set by a slot_override
  bookedCount?: number;
  blockedSpots?: number;
  capacity?: number;            // cars_per_slot
}
```

### Slot generation algorithm (step by step)

1. Look up `day_of_week` for the target date; load working hours (or use defaults).
2. If `is_open = false` **and** no whole-day `opened` override → return empty array.
3. Generate candidate times from `open_time` to `close_time` stepping by `slot_interval_minutes`.
4. Fetch all slot_overrides for `(vendor_id, date)`.
5. Fetch existing non-cancelled bookings grouped by time for that date (via RPC `get_booked_slots`).
6. For each candidate slot:
   - `taken = bookedCount + blockedSpots`
   - **Available** iff `taken < cars_per_slot`
   - Mark `reason = "past"` and `available = false` if the time ≤ current time on today
7. Apply override rules:
   - Whole-day `blocked` (`time = null`) → no slots at all.
   - Whole-day `opened` (`time = null`) → force-open even if `is_open = false`.
   - Per-time `blocked` → subtract `blocked_spots` from that slot's capacity.
   - Per-time `opened` → add an extra slot outside normal hours.
   - Any override sets `isManualOverride = true` on affected slots.
8. Return array sorted ascending by time.

### Available functions (availabilityService.ts)

| Function                                          | Returns                       |
| ------------------------------------------------- | ----------------------------- |
| `getAvailableSlots(vendorId, date, intervalMin?)` | `TimeSlot[]`                  |
| `isSlotAvailable(vendorId, date, time)`           | `boolean`                     |
| `getMonthAvailability(vendorId, year, month)`     | `Record<YYYY-MM-DD, boolean>` |

---

## 7. Booking — Creation

### Who can create a booking

Authenticated customers only. Guests see the booking form but must log in to submit.

### BookingSidebar fields (the form the customer fills)

| Field                         | Type                                           | Required?                            | Condition                                      |
| ----------------------------- | ---------------------------------------------- | ------------------------------------ | ---------------------------------------------- |
| Booking type                  | Select (`routine_maintenance` \| `inspection`) | ✅                                   | Always                                         |
| Branch                        | Select from `vendor_branches`                  | Only if vendor has > 1 active branch | —                                              |
| Vehicle                       | Select from My Garage                          | ✅ (can add new inline)              | —                                              |
| Mileage                       | Number                                         | ✅                                   | Only when `booking_type = routine_maintenance` |
| Problem description (`notes`) | Textarea                                       | ✅                                   | Only when `booking_type = inspection`          |
| Phone number                  | Text                                           | ✅                                   | Pre-filled from `users.phone`                  |
| Date                          | Date picker                                    | ✅                                   | Min = today                                    |
| Time slot                     | Time chip grid                                 | ✅                                   | Loaded from availability engine                |

### Server-side validation sequence (createBooking)

All of these checks happen on the server before the booking is inserted. Errors are returned
in `{ error: string }` and nothing is written to the DB if any check fails.

1. **Past-date check**
   - Rule: `booking_date` + `booking_time` must be in the future.
   - Error: `"Cannot book a slot in the past."`

2. **Type-specific field check**
   - Rule: `routine_maintenance` requires `mileage` to be a non-null number.
   - Error: `"Please enter your current vehicle mileage for maintenance bookings."`
   - Rule: `inspection` requires `notes` to be a non-empty string (after trimming).
   - Error: `"Please describe the problem or issue for inspection bookings."`

3. **One-active-booking gate**
   - Rule: A user may not have more than one booking whose `status` ∈
     `{confirmed, checked_in, in_progress, waiting_parts, ready_for_pickup}`.
   - Error: `"You already have an active booking. Please wait for it to be completed before booking a new appointment."`

4. **Slot conflict check**
   - Rule: No non-cancelled booking may share the same `vendor_id` + `booking_date` + `booking_time`
     (and `branch_id` when specified).
   - Error: `"This time slot is already booked. Please choose another."`

5. **Insert** — if all checks pass, the booking is created with:
   - `status = "confirmed"` (auto-confirmed, no manual vendor approval step)
   - Immediate audit row: `booking_status_history { status: 'confirmed', note: 'Booking created — auto-confirmed', changed_by: user_id }`

### DbBooking fields inserted

```
user_id, vendor_id, branch_id (nullable), vehicle_id (nullable),
service_key (nullable, e.g. "oil_change"),
booking_date (YYYY-MM-DD), booking_time (HH:MM),
booking_type, mileage (nullable), notes (nullable),
total_price (nullable — informational only, no payment collected),
status = "confirmed"
```

### Payment

**No payment at booking time.** `total_price` is optional metadata. Service is pay-at-shop.

### Post-creation notifications (all fire-and-forget, non-blocking)

- In-app: `notifyBookingConfirmed(userId, bookingId, centerName)`.
- Email + SMS to customer: via `notifyBookingConfirmedAction(bookingId)` server action.
- Email + SMS to vendor: same server action sends a parallel notification to the vendor/branch contact.

### CreateBookingInput type

```typescript
{
  userId: string;
  vendorId: string;
  branchId?: string | null;
  vehicleId: string | null;
  serviceKey?: string | null;
  bookingDate: string;        // YYYY-MM-DD
  bookingTime: string;        // HH:MM
  bookingType: BookingType;
  mileage?: number | null;
  notes?: string;
  totalPrice?: number;
}
```

---

## 8. Booking — Lifecycle & State Machine

### All status values

```
booked | confirmed | checked_in | in_progress |
waiting_parts | ready_for_pickup | completed | cancelled
```

New bookings start at **`confirmed`** (not `booked`).

### Allowed transitions (vendor/manager operate from the website)

```
booked            → cancelled
confirmed         → checked_in | cancelled
checked_in        → in_progress
in_progress       → waiting_parts | ready_for_pickup | completed
waiting_parts     → in_progress | ready_for_pickup
ready_for_pickup  → completed
completed         → (terminal, nothing further)
cancelled         → (terminal, nothing further)
```

Attempting any other transition returns:
`"Cannot transition from "{current}" to "{requested}"."`

### Active statuses (used for the one-active-booking gate)

`confirmed`, `checked_in`, `in_progress`, `waiting_parts`, `ready_for_pickup`

### Non-cancellable statuses

`in_progress`, `waiting_parts`, `ready_for_pickup`, `completed`

### What the customer sees (booking detail page)

- Vertical status timeline driven by `booking_status_history` (ordered by `changed_at` ASC).
- Each history row shows: status label, optional note, timestamp, actor.
- Booking fields: date/time, vendor name, vehicle, service type, mileage or notes, total price.
- Cancel button (visible only when status is cancellable — see §9).
- Reschedule button (visible only when eligible — see §9).
- Write review button (appears after `completed`).

### Automatic side-effects when status → `completed`

These fire via Postgres trigger (`award_booking_points / on_booking_completed`):

1. **Award loyalty points:**
   - Looks up `services.points_reward` for the `service_key`; falls back to `vendors.points_per_booking`.
   - Atomically increments `users.total_points`.
   - Inserts `points_transactions { type: 'booking_reward', points: +N, reference_id: bookingId }`.
   - If no matching service or points = 0 → awards 0 silently (no error).

2. **Increment vendor counter:**
   - Increments `vendors.completed_bookings` by 1.

### BookingStatusHistory row (written for every transition)

```
id, booking_id, status, note (optional), changed_by (user_id), changed_at
```

This table is **append-only** — rows are never updated or deleted.

### State diagram

```
              ┌─────────┐  cancel  ┌───────────┐
   create ──▶ │confirmed│ ───────▶ │ cancelled │  (terminal)
              └────┬────┘          └───────────┘
                   │ check-in
                   ▼
              ┌──────────┐
              │checked_in│
              └────┬─────┘
                   │ start
                   ▼
         ┌──────────────┐   need parts   ┌──────────────┐
         │ in_progress  │ ◀────────────▶ │waiting_parts │
         └──────┬───────┘                └──────┬───────┘
                │ ready                          │ ready
                ▼                                ▼
         ┌──────────────────┐
         │ ready_for_pickup │
         └────────┬─────────┘
                  │ complete
                  ▼
           ┌──────────┐
           │completed │  (terminal) → points + vendor counter++
           └──────────┘
```

---

## 9. Booking — Reschedule & Cancellation

### Cancellation

- **Who can cancel:** Customer or vendor (from their respective surfaces).
- **Cancellable from (service layer):** Any status NOT in `{in_progress, waiting_parts, ready_for_pickup, completed}`.
- **Error if not cancellable:** `"Cannot cancel a booking with status "{status}"."`
- **Side-effect:** Sets `cancelled_by` field (`"customer"` | `"vendor"` | `"admin"`).
- Audit row written with `note = reason ?? "Cancelled by user"`.
- A cancelled booking **immediately frees its slot** (excluded from capacity count).
- Notifications sent on cancellation:
  - If customer cancels: SMS + email to customer (confirmation) + email to vendor (alert).
  - If vendor cancels: SMS + email to customer (with reason).

#### UI cancel gate (booking list page — additional restriction)

The booking list (`/bookings`) applies a stricter rule on top of the service-layer rule:

```typescript
function canCancelBooking(booking): boolean {
  // status must be 'booked' or 'confirmed'
  if (!["booked", "confirmed"].includes(booking.status)) return false;
  // booking_date must be strictly after today (same-day bookings are NOT cancellable from the list)
  const today = startOfDay(new Date());
  const bookingDay = startOfDay(new Date(booking.booking_date));
  return bookingDay > today;
}
```

Result: a customer **cannot cancel a same-day booking** from the list page even if the 2-hour lock
has not yet passed. The cancel button is only shown for future-day bookings.

- **Reschedule-eligible statuses:** `confirmed`, `checked_in` only.
  All other statuses → `"This booking cannot be rescheduled."`
- **2-hour lock window** (`RESCHEDULE_LOCK_HOURS = 2`):
  Cannot reschedule if `hoursUntilAppointment < 2`.
  Error: `"Cannot reschedule within 2 hours of the appointment."`
- **New slot validation:** Runs the full validation suite:
  - New date/time must be in the future: `"Cannot reschedule to a past date/time."`
  - New slot must be free: `"The new time slot is already booked. Please choose another."`
- Audit row written: `note = "Rescheduled to {newDate} {newTime}"`.

---

## 10. Reviews & Ratings

### Who can write a review

Only a customer who has **at least one `completed` booking** at the vendor AND who has **not yet
reviewed that specific booking**. This is the "verified buyer" gate.

`getReviewEligibility(userId, vendorId)` returns:

- `eligibleBookingId: string | null` — the first unreviewed completed booking ID, or null.
- `alreadyReviewed: boolean` — true if all completed bookings have been reviewed.

### Review submission rules (all server-side)

1. `rating` must be an integer in **[1, 5]**. Error: `"Rating must be between 1 and 5."`
2. Booking must exist and `status = 'completed'`. Error: `"Reviews can only be submitted after service completion."`
3. Booking must belong to the submitting user. Error: `"Unauthorized."`
4. One review per booking (UNIQUE `booking_id`). Error: `"You have already reviewed this booking."`

### DbReview fields

```
id, booking_id (UNIQUE), vendor_id, user_id,
rating (smallint, CHECK 1–5), comment (nullable), vendor_reply (nullable),
created_at, updated_at
```

### After a review is submitted

`vendors.rating` and `vendors.total_reviews` are recalculated:

```
rating = ROUND(SUM(all ratings for vendor) / COUNT(*), 1 decimal place)
total_reviews = COUNT(*)
```

### Vendor reply (website only)

- `replyToReview(reviewId, vendorId, reply)` — verifies vendor ownership, sets `vendor_reply`.
- One reply per review; a new call overwrites the previous reply.
- Triggers a `review_reply` in-app notification to the customer.

### ReviewsSection UI (customer-facing)

- Star distribution bars (5★ → 1★ with percentage fill).
- Review cards: user avatar, full name, date, star rating, comment.
- Vendor reply shown in a muted box with "✓ Service Center Reply" badge.
- Write-review form: star picker (hover + click) + comment textarea.
- Eligibility is checked before showing the form; ineligible users see a message instead.
- Post-submit: success badge with checkmark replaces the form.

---

## 11. Loyalty Rewards & Points

### Points earn flow

**Trigger:** DB trigger `award_booking_points()` fires `AFTER UPDATE OF status ON bookings`
when the new status is `'completed'`.

**Points source lookup order:**

1. Match `bookings.service_key` against `services` to find `services.points_reward`.
2. If no match or `points_reward = 0`: fall back to `vendors.points_per_booking`.
3. If still 0 or no match: award 0 silently.

**What is written:**

- `users.total_points` incremented atomically.
- `points_transactions` row inserted:
  ```
  user_id, points (+N), type='booking_reward', reference_id=bookingId,
  note, created_at
  ```

### Rewards catalog (`rewards` table)

| Field                            | Type    | Notes                                                    |
| -------------------------------- | ------- | -------------------------------------------------------- |
| `title` / `title_ar`             | text    | Bilingual                                                |
| `description` / `description_ar` | text    | Nullable                                                 |
| `points_required`                | int     | Cost to redeem                                           |
| `category`                       | enum    | `wash \| detailing \| protection \| inspection \| other` |
| `type`                           | enum    | `service_reward` (QR code)                               |
| `value`                          | numeric | EGP amount or %                                          |
| `value_type`                     | text    | `fixed` \| `percent`                                     |
| `is_active`                      | bool    | Only active rewards shown                                |

### Redemption flow (`POST /api/rewards/redeem`)

1. Auth required.
2. Reward must be `is_active = true`.
3. Server reads `users.total_points` (never trusts the client).
4. If `total_points < points_required` → **`422` "Insufficient points"** — nothing is deducted.
5. Generate unique code: `WRS-` + 6 random chars from `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
   (ambiguous chars `0`, `1`, `I`, `O` excluded). Collision-retry up to 5 attempts.
6. Build QR data URL: `"{SITE_URL}/reward/use?code={code}"`.
7. Atomic deduct with optimistic lock:
   `UPDATE users SET total_points = total_points - N WHERE id = ? AND total_points = {oldValue}`.
   If 0 rows updated → `"Failed to deduct points"` (client should retry).
8. Insert `points_transactions { type: 'redeem_service', points: -N }`.
9. Insert `user_rewards { user_id, reward_id, code, qr_data, is_used: false }`.
10. Return `{ userReward }` with the reward joined.

### QR validation landing (`GET /api/rewards/validate?code=`)

- No auth required (public endpoint for QR scanning).
- Returns: `{ code, isUsed, usedAt, createdAt, reward: { title, title_ar, description, value, value_type, category, type } }`.
- Does NOT mark the code as used.

### Rewards UI screens

| Route                | Component          | Purpose                                                        |
| -------------------- | ------------------ | -------------------------------------------------------------- |
| `/{lang}/rewards`    | `RewardsDashboard` | Points balance hero, catalog, active vouchers, category filter |
| `/{lang}/reward/use` | `RewardUsePage`    | QR / manual code validation (vendor scans QR → this page)      |

**Rewards dashboard components:**

- `GiftBoxHero.tsx` — animated hero showing points balance.
- `RewardCard.tsx` — catalog card with points cost, category badge, redeem button.
- `VoucherModal.tsx` — shows issued voucher: QR code image + manual alphanumeric code.
- `PointsHistoryModal.tsx` — paginated transaction log (earn + spend).

---

## 12. Notifications

Outbound notifications (SMS + email) are sent live to customers via `outboundNotificationService.ts`

- Resend (email) + SMS stub.

| Event                                     | Recipients                    |
| ----------------------------------------- | ----------------------------- |
| Booking confirmed                         | Customer (SMS + email)        |
| Booking cancelled by customer             | Customer (confirmation)       |
| Booking cancelled by vendor               | Customer (with reason)        |
| Booking completed                         | Customer (with points earned) |
| Car ready for pickup (`ready_for_pickup`) | Customer                      |
| Daily booking reminders                   | Customers (cron, 11:00 Cairo) |

---

## 13. Profile & Account

### Route: `/{lang}/profile`

**What the customer can edit:**

- **Full name** — free text input.
- **Avatar URL** — URL input.
- **Email** — displayed as a disabled (read-only) field; cannot be changed via the app.

**Phone number — not editable from profile.** Phone is collected in the booking sidebar and
auto-saved to `users.phone` at booking submission time. The profile page has no phone field.

**What is displayed (read-only stats):**

- Booking count (total bookings for the user).
- Link to My Garage.
- Link to My Bookings.

> **Note:** The quick links section also links to `/orders` ("My Orders") but that route does
> not exist. It is a leftover from the removed parts marketplace.
