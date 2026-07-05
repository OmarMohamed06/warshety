PRODUCT REQUIREMENTS DOCUMENT (PRD)
Product Name: Garage (Working Name)

Type: B2C Marketplace + Services Booking + Vendor ERP Dashboard
Market: Egypt (Phase 1) → MENA Expansion (Phase 2)

1️⃣ PRODUCT VISION

Build Egypt’s most trusted automotive digital ecosystem combining:

• Spare parts marketplace
• Service center booking
• Vendor digital storefronts
• Lightweight ERP for workshops & shops

Goal:
Become the Talabat + Amazon + Vezeeta for cars in Egypt.

Success Definition:

Zero compatibility mistakes

Transparent pricing

Verified vendors

Strong SEO dominance in Arabic automotive searches

2️⃣ MARKET PROBLEM
Current Problems in Egypt:

Fake or wrong spare parts

No compatibility clarity

Overpriced services

No price transparency

No digital booking system

No verified reviews

Poor Google discoverability

Garage solves:
✔ Compatibility filtering
✔ Transparent ratings
✔ Structured service booking
✔ Vendor accountability
✔ SEO-driven discovery

3️⃣ TARGET USERS
Primary Users

Car owners (18–45)

Young drivers

Car enthusiasts

People tired of scams

People comparing service prices

Secondary Users

Spare parts shops

Service centers

Workshops

Mobile mechanics

4️⃣ CORE PRODUCT STRUCTURE (APP)

Bottom Navigation:

• Home
• Services
• Parts Shop
• Orders & Bookings
• Account

5️⃣ HOME PAGE STRUCTURE

Purpose: Discovery + Conversion

Sections:

Smart Search (Parts + Services unified search)

Add / Select My Car

Featured Service Centers

Featured Parts Deals

Popular Services

Recently Viewed

Promotions Banner

Emergency Roadside Assistance CTA

Conversion Goals:

Add Car

Book Service

Add to Cart

6️⃣ CAR PROFILE SYSTEM (CORE ENGINE)

User must select:

Brand
Model
Year
Trim
Engine Type
Engine Code
Transmission
Chassis (optional)

Saved as:
“My Garage”

Enables:

✔ Compatibility-only filtering
✔ Service recommendations
✔ Maintenance history tracking
✔ Personalized homepage

This system is the backbone of product logic.

7️⃣ PARTS MARKETPLACE
A. Browsing Options

User can browse by:

Category

Compatibility

Direct search

Brand

Deals

B. ADVANCED FILTER SYSTEM (MANDATORY)

Filters:

Car Brand

Model

Year Range

Engine Code

OEM Number

Part Number

Vendor

Price Range

Condition

Location

Availability

Delivery Time

Rating

Performance requirement:
Filters must be instant (ElasticSearch recommended).

C. Product Page Requirements

Must Include:

High resolution images

Compatible vehicles list

OEM number

Manufacturer

Warranty details

Installation available (Yes/No)

Vendor profile link

Vendor rating

Verified reviews

Delivery estimate

Return policy

Chat with seller

Stock status

SEO requirement:
Every product page must be indexable.

D. Checkout Flow

Steps:

Add to cart

Select delivery or pickup

Select payment

Confirm

Order tracking

Payment Methods:

Cash on delivery

Card

Wallet (future)

8️⃣ SERVICES BOOKING MODULE
Search Method 1: By Service

Examples:

Oil Change
Brake Replacement
AC Repair
Diagnostics
Body Repair

Filters:

Location

Rating

Price range

Available today

Mobile / Workshop

Search Method 2: By Service Center

Service Center Profile Must Include:

Name

Cover photo

Gallery

Map

Hours

Services list

Starting prices

Rating

Reviews

Certifications

Completed bookings count

Book Now CTA

Booking Flow

Select service

Select vehicle

Select date/time

Confirm

Payment (optional deposit)

Confirmation SMS + push notification

9️⃣ REVIEW SYSTEM

Applies to:

Products

Vendors

Service centers

Features:

✔ 1–5 star rating
✔ Written review
✔ Photo upload
✔ Verified purchase badge
✔ Report abuse

Anti-Fake System:
Only verified buyers can review.

AI moderation required in Phase 2.

🔟 ACCOUNT SYSTEM

Includes:

My Garage

Orders

Bookings

Wishlist

Addresses

Payment methods

Become Vendor

Settings

1️⃣1️⃣ VENDOR ONBOARDING

Steps:

Application form

Document upload

Manual admin approval

KYC verification

Dashboard access

Compliance:
Commercial registration required.

1️⃣2️⃣ VENDOR DASHBOARD (Light ERP)
Overview

Revenue

Orders

Rating

Bookings

Sales chart

Inventory

Vendor can:

Add product

Set compatibility

Upload images

Set OEM

Set stock

Edit price

Toggle availability

Future:
Bulk Excel upload

Orders Management

Accept / Reject

Update status

Print invoice

Contact customer

Bookings

Approve

Reschedule

Mark completed

Add notes

Add extra charges

Reviews

View

Respond

Report

Analytics

Revenue trends

Best sellers

Conversion rate

Repeat customers

1️⃣3️⃣ ADMIN PANEL

Admin Capabilities:

Vendor approval

Product moderation

Refund control

Dispute resolution

Commission control

Category management

Promo codes

Featured listing control

User banning

Security:
Role-based admin permissions.

1️⃣4️⃣ SEO STRATEGY (CRITICAL FOR SUCCESS)

This is what will make Garage dominate Google in Egypt.

A. SEO STRUCTURE

Must use:

Server-side rendering (Next.js recommended)

Clean URL structure

Structured data (JSON-LD)

Sitemap auto-generation

Canonical tags

Arabic + English indexing

B. URL STRUCTURE

Parts:

/parts/brakes/brake-pads-bmw-320i-2015
/parts/engine/oil-filter-toyota-corolla-2018

Services:

/services/oil-change-cairo
/service-center/abc-auto-cairo

SEO Rule:
URL must include:

Part name

Brand

Model

Year (when possible)

C. PROGRAMMATIC SEO (VERY IMPORTANT)

Create landing pages automatically for:

Brake pads BMW 320i 2015

Oil filter Hyundai Elantra 2017

Oil change near me Cairo

BMW service center Nasr City

This creates thousands of indexed pages.

D. On-Page SEO Rules

Every product page must have:

H1: Product Name + Compatible Car
Meta Title (60 chars max)
Meta Description (155 chars max)
Alt text for all images
Internal linking to category + vendor

E. Technical SEO Requirements

Core Web Vitals optimized

Page load < 2.5 seconds

Mobile-first design

Schema markup for:

Product

LocalBusiness

Service

Review

FAQ

F. Arabic SEO

Must target:

Arabic search phrases like:

قطع غيار بي ام دبليو 320

مركز صيانة تويوتا

تغيير زيت قريب مني

Content must be bilingual.

1️⃣5️⃣ TRUST & SAFETY SYSTEM

To avoid scams:

✔ Vendor verification
✔ Order tracking
✔ Review verification
✔ Escrow payment (Phase 2)
✔ Dispute resolution system
✔ Rating transparency

1️⃣6️⃣ MONETIZATION

Option A: Commission (5–12%)
Option B: Vendor subscription
Option C: Featured listings
Option D: Lead fee for bookings

Long-term:
Ads + Insurance partnerships + Financing

1️⃣7️⃣ PHASE ROADMAP

Phase 1 (MVP)

Parts marketplace

Basic service booking

Vendor dashboard

Manual admin review

Phase 2

Escrow payments

AI recommendations

Mobile app

Inventory bulk upload

Loyalty program

Phase 3

Financing

Roadside assistance network

Insurance integrations

Maintenance reminders AI

1️⃣8️⃣ SUCCESS METRICS (KPIs)

GMV

Conversion rate

Booking rate

Repeat customers

CAC

LTV

Vendor retention rate

Organic traffic growth

---

---

# PART II — DETAILED FUNCTIONAL SPECIFICATIONS

> **Scope of this part:** This part specifies the **customer mobile app only**. The spare-parts marketplace (catalog, cart, checkout, orders, delivery, card payment) is **removed** and excluded. **All vendor, branch-manager, and admin operations live in the website dashboard — they are NOT part of the app.** The app is customer-only; it merely **consumes** the data those website roles produce. The authoritative app surfaces are: **My Garage, service discovery, booking, the booking lifecycle, reviews, loyalty rewards, notifications**, plus **§30 — the shared logic that connects the app to the website's vendor dashboard.**
>
> **How to read each feature:** Every feature below follows the same template — **Purpose · Actors · Preconditions · Flow · Business Rules · States · Edge Cases · Acceptance Criteria (Given/When/Then)**. Numeric constants, field names, enum values, and validation messages are taken from the live implementation and are binding.

---

## 19. Conventions, Roles & Definitions

### 19.1 Glossary

| Term               | Meaning                                                                                                   |
| ------------------ | --------------------------------------------------------------------------------------------------------- |
| **Active vehicle** | The single vehicle currently selected in My Garage that personalizes discovery and pre-fills booking.     |
| **Active booking** | A booking whose status ∈ {`confirmed`, `checked_in`, `in_progress`, `waiting_parts`, `ready_for_pickup`}. |
| **Slot**           | A bookable time on a vendor/branch calendar, defined by interval and capacity.                            |
| **Verified buyer** | A user who has at least one `completed` booking with a given vendor.                                      |
| **BFF**            | The Next.js API layer acting as a Backend-for-Frontend over Supabase for server-only logic.               |

### 19.2 Roles

> **The mobile app serves the `customer` role exclusively.** Vendor, manager, and admin users operate **entirely on the website dashboard**; the app never renders their screens and never performs their writes — it only consumes the data they produce (see §30).

| Role (`users.role`) | Description                                            | Where they operate                                                             |
| ------------------- | ------------------------------------------------------ | ------------------------------------------------------------------------------ |
| `customer`          | Default role on sign-up. Car owner.                    | **Mobile app** (Home, Services, Bookings, Garage, Rewards, Profile) + website. |
| `vendor`            | Service-center owner (`vendor_type = service_center`). | **Website dashboard only — not in the app.**                                   |
| `manager`           | Branch manager assigned to one or more branches.       | **Website dashboard only — not in the app.**                                   |
| `admin`             | Platform operator.                                     | **Website only — not in the app.**                                             |

### 19.3 Standard validation & error conventions

- All write operations return either a success payload or `{ error: string }` with an HTTP status (`200` ok, `401` unauthenticated, `403` forbidden, `404` not found, `422` business-rule violation).
- Notification side-effects (SMS/email/push) are **fire-and-forget and non-fatal** — a failed notification never blocks the primary action.
- Money/points operations are **server-authoritative and atomic** — the client never computes final balances.
- All authorization is ultimately enforced by **Supabase RLS**; client-side guards are UX only.

---

## 20. Authentication & Session

### 20.1 Purpose

Provide secure, personalized accounts with email/password and Google sign-in, email verification, password reset, and role-aware routing.

### 20.2 Actors

Guest, Customer, Vendor, Branch Manager, Admin.

### 20.3 Login methods

1. **Email + password** — `signInWithPassword`. Unconfirmed emails return the sentinel `__email_not_confirmed__` so the UI can prompt "check your inbox."
2. **Google OAuth** — `signInWithOAuth({ provider: 'google' })` → `/auth/callback`.
3. **Apple Sign-In** — required for iOS App Store compliance (to be added on mobile).

### 20.4 Registration flow

1. Customer signs up with `{ full_name, role: 'customer' }` metadata and `emailRedirectTo = /auth/callback`.
2. DB trigger `on_auth_user_created → handle_new_user()` auto-creates the `public.users` profile row.
3. Confirmation email is sent; user remains unconfirmed until the link is followed.
4. Vendors are **not** created via public sign-up (see §30).

### 20.5 Password reset flow

1. `POST /api/auth/forgot-password { email }`.
2. Server generates a Supabase recovery link and sends a branded Resend email. **Always returns success** (no email enumeration).
3. Recovery link → `/auth/reset-password`; `GET /api/auth/set-session` exchanges `access_token`/`refresh_token` into a session; user sets a new password.

### 20.6 Session & role resolution

- On session resolve, three parallel queries run: `users` (role + points), `vendors` (if vendor), `branch_users` (if manager) to determine the shell to mount.
- Web uses cookie-based SSR sessions refreshed by middleware; mobile uses secure-storage tokens with auto-refresh.

### 20.7 Business rules

- **BR-AUTH-1:** Email confirmation is **enforced** before login; unconfirmed users cannot authenticate.
- **BR-AUTH-2:** Vendors created via onboarding start `email_confirm = false` and **cannot log in until admin approval** confirms their email.
- **BR-AUTH-3:** Tokens are stored only in secure storage and never logged.
- **BR-AUTH-4:** Role is read server-side from `users.role`; the client must not be the sole gate.

### 20.8 Edge cases

- OAuth account whose email matches an existing password account → link to the same `users` row (do not duplicate).
- Recovery link reused/expired → show "link expired, request a new one."
- Sign-out clears cookies server-side via `POST /api/auth/signout` followed by a hard redirect.

### 20.9 Acceptance criteria

- **AC-AUTH-1:** _Given_ an unconfirmed email, _when_ the user logs in, _then_ the UI shows the "confirm your email" prompt and login is denied.
- **AC-AUTH-2:** _Given_ any email (existing or not), _when_ a reset is requested, _then_ the API responds success without revealing whether the account exists.
- **AC-AUTH-3:** _Given_ a successful login, _when_ the session resolves, _then_ the user is routed to the shell matching their role (customer/vendor/manager/admin).

---

## 21. My Garage (Vehicle Profiles)

### 21.1 Purpose

Let users save vehicles and designate one **active vehicle** that personalizes discovery, pre-fills bookings, and anchors maintenance history. This is the core personalization engine.

### 21.2 Actors

Guest (local only), Customer (synced).

### 21.3 Vehicle data model

| Field   | DB column      | Type | Required | Notes                                       |
| ------- | -------------- | ---- | -------- | ------------------------------------------- |
| Brand   | `make`         | text | ✅       | From `car_makes` catalog.                   |
| Model   | `model`        | text | ✅       | From `car_models` catalog.                  |
| Year    | `year`         | int  | ✅       | Constrained by model `year_from`/`year_to`. |
| Trim    | `trim`         | text | ⬜       | Free text.                                  |
| Engine  | `engine_code`  | text | ⬜       | Free text; used for finer compatibility.    |
| Color   | `color`        | text | ⬜       |                                             |
| Plate   | `plate_number` | text | ⬜       |                                             |
| Mileage | `mileage`      | int  | ⬜       | Current odometer.                           |
| Default | `is_default`   | bool | —        | Marks the persisted default vehicle.        |

### 21.4 Stepped add/edit flow

1. **Make** — `useCarMakes()` loads active makes (ordered by name; popular flagged).
2. **Model** — `useCarModels(makeId)` loads active models for the chosen make.
3. **Year** — derived from the selected model's `year_from`…`year_to` range.
4. **Trim** — optional free text.
5. **Engine** — optional free text.
6. Optional: color, plate, mileage.
7. Save → vehicle becomes **active** if no active vehicle currently exists.

### 21.5 Persistence & sync

- **Guest:** stored in `localStorage` (`garage_vehicles`, `garage_active_id`) only; no backend sync.
- **Authenticated:** written to `vehicles` table **and** mirrored to `localStorage` for instant restore.
- **On login:** fetch `vehicles`; restore `activeVehicle` from `localStorage` if still valid, else fall back to `is_default` or the first vehicle.
- **Guest → authenticated merge:** local guest vehicles are upserted into `vehicles`, deduped by `(make, model, year, trim)`.

### 21.6 Business rules

- **BR-GAR-1:** Exactly **one** active vehicle at a time.
- **BR-GAR-2:** Adding the first vehicle auto-activates it.
- **BR-GAR-3:** Deleting the active vehicle clears the active selection (`activeId = null`).
- **BR-GAR-4:** Garage is **offline-readable** once loaded.
- **BR-GAR-5:** When no vehicle is active, discovery degrades gracefully (show all, no compatibility filter).

### 21.7 Compatibility matching

Match is conservative and case-insensitive: brand **and** model **and** year must all be present in a candidate's compatibility descriptor; if `engine_code` is set, an additional engine filter applies.

### 21.8 Edge cases

- Year outside model range → block selection with inline helper.
- Duplicate vehicle (same make/model/year/trim) on add → warn and prevent duplicate.
- Catalog gap (model not listed) → allow free-text model entry as fallback (still year-bounded by user input).

### 21.9 Acceptance criteria

- **AC-GAR-1:** _Given_ a guest adds a vehicle, _when_ they later log in, _then_ the vehicle is upserted to their account without duplication.
- **AC-GAR-2:** _Given_ two saved vehicles, _when_ the user switches the active vehicle from the header chip, _then_ discovery and the booking pre-fill update immediately.
- **AC-GAR-3:** _Given_ the active vehicle is deleted, _when_ the deletion completes, _then_ no vehicle is active and the header chip prompts re-selection.

---

## 22. Service Discovery (Centers & Services)

### 22.1 Purpose

Help customers find the right service center — by service type or by center — and reach a bookable profile.

### 22.2 Actors

Guest, Customer.

### 22.3 Entry paths

1. **By service** (e.g., Oil Change, Brakes, AC, Diagnostics, Body, Inspection) with filters: location, rating, price range, available today, mobile/workshop.
2. **By service center** directory (list + map toggle) with search and filters.
3. **Global search** (debounced) across vendors and services with relevance ranking.

### 22.4 Service-center profile

Must include: name (+ `name_ar`), cover/gallery, map + address, working hours, services list with starting prices, rating + review count, branches, completed-bookings count, and a sticky **Book Now** CTA.

### 22.5 Business rules

- **BR-DISC-1:** Only **approved** vendors (`vendors.status = 'approved'`) and **active** services (`services.active = true`) are publicly visible.
- **BR-DISC-2:** Public reads expose only public vendor fields — never KYC/bank/ID columns.
- **BR-DISC-3:** Ratings shown are the denormalized `vendors.rating` / `total_reviews`.

### 22.6 Edge cases

- Vendor suspended after a customer opened the profile → block booking with "currently unavailable."
- No services configured → hide the Book CTA and show an empty state.
- Active-vehicle make not in `supported_makes` → still allow booking but surface a soft "confirm compatibility" note.

### 22.7 Acceptance criteria

- **AC-DISC-1:** _Given_ a pending/suspended vendor, _when_ a guest browses the directory, _then_ that vendor does not appear.
- **AC-DISC-2:** _Given_ a center profile, _when_ it loads, _then_ services, hours, rating, and at least one bookable slot source are available before the Book CTA is enabled.

---

## 23. Availability & Slot Engine

### 23.1 Purpose

Compute bookable time slots per vendor/branch per day from working hours, overrides, capacity, and existing bookings.

### 23.2 Inputs

- `vendor_working_hours` — per `day_of_week` (0=Sun … 6=Sat): `open_time`, `close_time`, `is_open`. Unique `(vendor_id, day_of_week)`.
- `vendor_slot_settings` — `slot_interval_minutes` (default **30**; allowed 15/20/30/45/60), `cars_per_slot` (default **1**; range 1–20).
- `slot_overrides` — `(vendor_id, date, time?, type, blocked_spots, note)`; `time = null` ⇒ whole-day override; `type ∈ {blocked, opened}`. Unique `(vendor_id, date, time)`.
- Existing `bookings` for the date (non-cancelled).

### 23.3 Default working hours (fallback when unset)

| Day     | Open  | Close | Open? |
| ------- | ----- | ----- | ----- |
| Sun (0) | 09:00 | 17:00 | ❌    |
| Mon (1) | 08:00 | 20:00 | ✅    |
| Tue (2) | 08:00 | 20:00 | ✅    |
| Wed (3) | 08:00 | 20:00 | ✅    |
| Thu (4) | 08:00 | 20:00 | ✅    |
| Fri (5) | 09:00 | 17:00 | ✅    |
| Sat (6) | 09:00 | 14:00 | ✅    |

### 23.4 Algorithm

1. Resolve `day_of_week` for the target date; load working hours. If `is_open = false` **and** no whole-day `opened` override → return `[]`.
2. Generate base slots from `open_time` to `close_time` stepping by `slot_interval_minutes`.
3. Apply overrides: whole-day `blocked` → no slots; whole-day `opened` → force-open; per-time `blocked` → reduce that slot's capacity by `blocked_spots`; per-time `opened` → add an extra slot outside normal hours.
4. Count non-cancelled bookings per time.
5. For each slot: `taken = booked_count + blocked_spots`. Slot is **available** iff `taken < cars_per_slot`.
6. For **today**, hide any slot whose time ≤ current time (reason = `past`).

### 23.5 Business rules

- **BR-SLOT-1:** A `cancelled` booking never consumes capacity.
- **BR-SLOT-2:** Capacity is per-slot via `cars_per_slot`; multiple cars may share a slot when capacity > 1.
- **BR-SLOT-3:** No minimum lead time and no maximum look-ahead are enforced — any future slot is bookable; only current/past times are blocked.
- **BR-SLOT-4:** Branch-scoped availability uses the branch's own hours/overrides where present.

### 23.6 Edge cases

- Override `blocked_spots` ≥ `cars_per_slot` → slot fully unavailable.
- DST/timezone: all times are evaluated in the platform's local (Cairo) day context.
- Working hours edited mid-day → recompute uses the new hours immediately for future slots.

### 23.7 Acceptance criteria

- **AC-SLOT-1:** _Given_ `cars_per_slot = 1` and one confirmed booking at 10:00, _when_ slots render, _then_ 10:00 is unavailable (reason `booked`).
- **AC-SLOT-2:** _Given_ a whole-day `blocked` override, _when_ the day is queried, _then_ no slots are returned.
- **AC-SLOT-3:** _Given_ today, _when_ the current time is 11:15, _then_ all slots ≤ 11:15 are hidden as `past`.

---

## 24. Booking Creation

### 24.1 Purpose

Create a confirmed service appointment for a chosen vehicle, service, and slot.

### 24.2 Actors

Customer (authenticated).

### 24.3 Preconditions

Authenticated user, an active vehicle (or one chosen in-flow), a visible approved vendor, and an available slot.

### 24.4 Flow (4 steps)

1. **Service** — choose a service (or service type / `booking_type`).
2. **Vehicle** — confirm the active vehicle or pick another from the garage.
3. **Slot** — pick date + time from the availability engine (§23).
4. **Confirm** — review and submit. On success: confirmation screen + SMS/email + in-app notification.

### 24.5 Required fields by booking type

- `booking_type = routine_maintenance` → **`mileage` is required** (current odometer integer).
  - Reject: _"Please enter your current vehicle mileage for maintenance bookings."_
- `booking_type = inspection` → **`notes` is required** (non-empty problem description).
  - Reject: _"Please describe the problem or issue for inspection bookings."_

### 24.6 Validation sequence (server-authoritative)

1. **Past-date check** — date/time must be in the future. Reject: _"Cannot book a slot in the past."_
2. **Type field check** — see §24.5.
3. **One-active-booking gate** — if the user has any **active booking** (§19.1), reject: _"You already have an active booking. Please wait for it to be completed before booking a new appointment."_
4. **Slot-conflict check** — no non-cancelled booking may exist for the same `vendor_id` + `booking_date` + `booking_time` (+ `branch_id` when applicable). Reject: _"This time slot is already booked. Please choose another."_
5. **Insert** — status = **`confirmed`** (auto-confirmed; no separate vendor approval step).
6. **Audit** — insert `booking_status_history` row: `status='confirmed'`, `note='Booking created — auto-confirmed'`, `changed_by = user_id`.

### 24.7 Persisted fields

`user_id`, `vendor_id`, `branch_id?`, `vehicle_id`, `service_key?`, `booking_date` (YYYY-MM-DD), `booking_time` (HH:MM), `booking_type`, `mileage?`, `notes?`, `total_price?`.

### 24.8 Payment

**No deposit or online payment** at booking. `total_price` is optional metadata; service is pay-at-shop.

### 24.9 Edge cases

- Two users submit the same slot simultaneously → the slot-conflict check + DB constraints reject the second.
- User edits the active vehicle after step 2 → booking uses the vehicle captured at confirm time.
- Vendor suspended between step 3 and confirm → reject with "currently unavailable."

### 24.10 Acceptance criteria

- **AC-BOOK-1:** _Given_ an existing active booking, _when_ the user attempts a new booking, _then_ it is rejected with the one-active-booking message.
- **AC-BOOK-2:** _Given_ `booking_type = routine_maintenance` without mileage, _when_ submitting, _then_ it is rejected with the mileage message.
- **AC-BOOK-3:** _Given_ a valid submission, _when_ it succeeds, _then_ the booking is `confirmed`, a history row is written, and confirmation notifications are dispatched (non-blocking).

---

## 25. Booking Lifecycle State Machine

### 25.1 Purpose

Track each booking through an 8-state operational lifecycle with an immutable audit trail and a live customer timeline.

### 25.2 States

`booked` · `confirmed` · `checked_in` · `in_progress` · `waiting_parts` · `ready_for_pickup` · `completed` · `cancelled` (plus `no_show`). New bookings begin at **`confirmed`**.

### 25.3 Allowed transitions (vendor/manager-controlled)

```
booked            → cancelled
confirmed         → checked_in | cancelled
checked_in        → in_progress
in_progress       → waiting_parts | ready_for_pickup | completed
waiting_parts     → in_progress | ready_for_pickup
ready_for_pickup  → completed
completed         → (terminal)
cancelled         → (terminal)
```

### 25.4 Side-effects on completion

On transition to `completed`, triggers fire:

- **Award points** (`award_booking_points()`): credit `users.total_points` from `services.points_reward` (or vendor `points_per_booking` fallback); insert `points_transactions` (`type='booking_reward'`). Zero/absent reward → award 0 silently.
- **Maintenance record**: auto-create a `maintenance_records` row for the vehicle.
- **Vendor counter**: increment `vendors.completed_bookings`.

### 25.5 Audit trail

Every transition writes an immutable `booking_status_history` row: `booking_id`, `status`, `note`, `changed_by`, `changed_at`. The customer timeline reads this history (live via Realtime on mobile).

### 25.6 Business rules

- **BR-LIFE-1:** Only transitions in §25.3 are permitted; others are rejected.
- **BR-LIFE-2:** `completed` and `cancelled` are terminal.
- **BR-LIFE-3:** Status changes are scoped by RLS to the owning vendor / assigned branch.

### 25.7 Edge cases

- Attempt to skip states (e.g., `confirmed → completed`) → rejected.
- Re-completing an already `completed` booking → blocked (no double points; idempotent award).
- `no_show` recorded by vendor for a customer who never checked in (operational state).

### 25.8 Acceptance criteria

- **AC-LIFE-1:** _Given_ a `confirmed` booking, _when_ the vendor sets `in_progress` directly, _then_ the transition is rejected (must pass `checked_in`).
- **AC-LIFE-2:** _Given_ a booking moves to `completed`, _when_ the trigger runs, _then_ points are awarded once, a maintenance record is created, and `completed_bookings` increments.

---

## 26. Reschedule & Cancellation

### 26.1 Cancellation

- **Allowed** only from non-terminal, pre-work states. **Cannot cancel** when status ∈ {`in_progress`, `waiting_parts`, `ready_for_pickup`, `completed`}.
  - Reject: _"Cannot cancel a booking with status "{status}"."_
- A cancelled booking immediately frees its slot capacity (§23, BR-SLOT-1).

### 26.2 Reschedule

- **Allowed FROM** `confirmed` or `checked_in` only. Otherwise reject: _"This booking cannot be rescheduled."_
- **Lock window:** cannot reschedule within **2 hours** of the appointment (`RESCHEDULE_LOCK_HOURS = 2`). Reject: _"Cannot reschedule within 2 hours of the appointment."_
- Reschedule re-runs the full booking validation (past-date, slot-conflict) against the new slot.

### 26.3 Edge cases

- Reschedule into a now-blocked slot → rejected by slot-conflict.
- Concurrent vendor status change to `in_progress` during a customer reschedule → reschedule rejected (state no longer eligible).

### 26.4 Acceptance criteria

- **AC-RES-1:** _Given_ an appointment 90 minutes away, _when_ the customer reschedules, _then_ it is rejected by the 2-hour lock.
- **AC-CAN-1:** _Given_ a booking in `in_progress`, _when_ cancel is attempted, _then_ it is rejected with the status message.

---

## 27. Reviews & Ratings

### 27.1 Purpose

Capture verified 1–5 star reviews tied to completed bookings, with one vendor reply and automatic rating recalculation.

### 27.2 Eligibility (verified-buyer gating)

`getReviewEligibility(userId, vendorId)` returns the first **unreviewed `completed`** booking ID for that vendor, or `alreadyReviewed = true`. Only such bookings may be reviewed.

### 27.3 Submission rules

- `rating` must satisfy **1 ≤ rating ≤ 5** — else _"Rating must be between 1 and 5."_
- Booking must be `completed` — else _"Reviews can only be submitted after service completion."_
- Booking must belong to the user — else _"Unauthorized."_
- **One review per booking** (UNIQUE `booking_id`) — else _"You have already reviewed this booking."_

### 27.4 Rating recalculation

On each insert: `vendors.rating = round(SUM(ratings)/COUNT, 1 decimal)` and `vendors.total_reviews = COUNT`.

### 27.5 Vendor reply

`replyToReview(reviewId, vendorId, reply)` verifies vendor ownership and sets `vendor_reply` (one reply; overwrites). A `review_reply` notification is sent to the customer.

### 27.6 Edge cases

- User with multiple completed bookings at one vendor can leave one review **per booking**.
- Photo upload (where enabled) stores to the review-photos bucket; failures are non-blocking.

### 27.7 Acceptance criteria

- **AC-REV-1:** _Given_ a user with no completed booking at a vendor, _when_ they open the composer, _then_ submission is blocked as ineligible.
- **AC-REV-2:** _Given_ a 5-star review is added to a vendor with prior 4.0 avg over 4 reviews, _when_ saved, _then_ `total_reviews = 5` and `rating` reflects the recomputed average to one decimal.

---

## 28. Loyalty Rewards

### 28.1 Purpose

Reward completed bookings with points redeemable for **service vouchers** delivered as QR/manual codes.

### 28.2 Earning

- Trigger: booking → `completed` (§25.4). Points come from `services.points_reward` (or `vendors.points_per_booking`).
- `users.total_points` is incremented atomically; a `points_transactions` row (`booking_reward`) is written.

### 28.3 Redemption (`POST /api/rewards/redeem`)

1. Auth required.
2. Reward must be `is_active = true`.
3. Server reads `users.total_points` (never the client) and requires `total_points ≥ points_required`; else **`422` "Insufficient points."**
4. Generate a unique code: prefix `WRS-` + random from charset `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (ambiguous chars excluded); collision-retry up to 5×.
5. Build QR data: `{SITE_URL}/reward/use?code={code}`.
6. **Atomic deduct** with optimistic lock: `UPDATE users SET total_points = total_points - points_required WHERE id = ? AND total_points = old_value`; if 0 rows → _"Failed to deduct points"_ (UI retry).
7. Log `points_transactions` (`redeem_service`, negative points).
8. Insert `user_rewards` (`code`, `qr_data`, `is_used = false`).

### 28.4 Voucher use at vendor (`POST /api/rewards/use`)

- Caller must be `vendor`/`manager`/`admin`.
- Look up `user_rewards` by upper-cased code; must exist and `is_used = false` (else _"Code already used"_ / _"Code not found"_).
- Atomically set `is_used = true`, `used_at = now()`.

### 28.5 Business rules

- **BR-RWD-1:** Point math is server-authoritative; the client never commits balances.
- **BR-RWD-2:** Voucher codes are unique (`user_rewards.code` UNIQUE) and single-use.
- **BR-RWD-3:** Issued vouchers remain usable offline (QR is self-contained) until redeemed server-side.

### 28.6 Edge cases

- Concurrent redeem with stale balance → optimistic lock fails one attempt; UI re-reads and retries.
- Reward deactivated between view and redeem → redeem rejected.

### 28.7 Acceptance criteria

- **AC-RWD-1:** _Given_ `total_points < points_required`, _when_ redeem is called, _then_ it returns `422` and no points are deducted.
- **AC-RWD-2:** _Given_ a valid voucher, _when_ a vendor uses it once, _then_ a second use is rejected as already used.

---

## 29. Notifications

### 29.1 Purpose

Keep users informed via an in-app feed plus outbound SMS/email (and FCM push on mobile).

### 29.2 In-app notifications (`notifications`)

Types: `booking_confirmed`, `booking_cancelled`, `booking_status_changed`, `message_received`, `review_reply`, `vendor_approved`, `vendor_rejected`. Operations: `createNotification`, `getUserNotifications` (≤50), `getUnreadCount`, `markRead`, `markAllRead`.

### 29.3 Outbound notifications (`notification_log`)

Event types include: `booking_confirmed`, `booking_reminder`, `car_ready`, `new_booking_vendor`, `payment_due`, `payment_overdue`, `vendor_approved`, `vendor_rejected`, `application_received`, `booking_completed`, `vendor_booking_cancelled`.

- **Email:** live via Resend (`RESEND_FROM_EMAIL` / `RESEND_FROM_NAME`).
- **SMS:** stub (`sendSMS` logs to console); accepts `+20XXXXXXXXXX` or `01XXXXXXXXX`; ready for a provider.

### 29.4 Rate limiting & dedup

- `canSend()` checks `notification_log` within a window (default 24h SMS, 1h email).
- `idempotencyKey` (e.g., `bookingId`) dedupes the same event for the same entity; `message_hash` guards duplicate bodies; `windowHours=0` disables limiting.

### 29.5 Triggers

- Booking confirmed → customer + vendor (`notifyBookingConfirmedAction`).
- Status → `ready_for_pickup`/`completed` → customer.
- Daily reminder job (`/api/cron/reminders`, 11:00 Cairo) → customers + vendor daily summary.
- Vendor approval/rejection → vendor.
- Billing due/overdue → vendor.

### 29.6 Business rules

- **BR-NOTIF-1:** Notification failures are non-fatal and never block the primary action.
- **BR-NOTIF-2:** Outbound sends respect rate-limit + dedup parity recorded in `notification_log`.
- **BR-NOTIF-3:** `notification_log` is **service-role only** (no client access).

### 29.7 Acceptance criteria

- **AC-NOTIF-1:** _Given_ the same `booking_reminder` for one booking within the window, _when_ a second send is attempted, _then_ it is suppressed by dedup.
- **AC-NOTIF-2:** _Given_ an email provider outage, _when_ a booking is confirmed, _then_ the booking still succeeds and the failure is logged.

---

## 30. Vendor Dashboard (Website) ↔ Mobile App Integration

> **The app contains no vendor, manager, or admin functionality.** Those roles operate entirely on the **website dashboard**. This section is the **only** vendor-related content relevant to the app: the **shared data contract and synchronization logic** — how vendor-driven changes on the website surface in the customer app, and how customer app actions surface to the vendor dashboard.

### 30.1 Shared system boundary

- The app and the website share the **same Supabase database** under the **same RLS policies**.
- The app authenticates only as `customer`; it must **never** perform vendor/manager/admin writes.
- The app **reacts to** vendor-driven changes (booking status, replies, availability, voucher use) but does not produce them.

### 30.2 Booking status sync (vendor website → app)

- The vendor advances a booking through the lifecycle (§25) from the **website dashboard**.
- Each transition writes a `booking_status_history` row; the app subscribes to the booking + history via **Supabase Realtime** and updates the live timeline.
- Customer-facing pushes fire on key transitions: `ready_for_pickup` ("car ready") and `completed` (completion + points).
- **App responsibility:** display only — render status, timestamp, and optional note. No transition controls in the app.

### 30.3 Availability source (vendor website → app)

- The slot engine (§23) reads vendor-configured `vendor_working_hours`, `vendor_slot_settings`, and `slot_overrides` — all authored on the website.
- The app **consumes** computed availability and reflects changes (new blocks/openings, capacity edits) on next fetch/refresh.
- **App responsibility:** read-only availability; never write hours/overrides/capacity.

### 30.4 Review reply (vendor website → app)

- The vendor replies to a review on the website, setting `reviews.vendor_reply`.
- The app shows the reply under the customer's review and delivers a `review_reply` notification.

### 30.5 Booking confirmation & cancellation (both directions)

- **App → vendor website:** a customer booking inserts a `confirmed` row; the website dashboard receives a `new_booking_vendor` alert.
- **Vendor website → app:** a vendor cancellation triggers `vendor_booking_cancelled` / `booking_cancelled` to the customer (in-app + outbound) and frees the slot.

### 30.6 Reward voucher (app issues, vendor website consumes)

- The customer redeems points in the app to mint a single-use voucher (`user_rewards.code`, §28).
- The **vendor/manager redeems** it on the website via `POST /api/rewards/use`, flipping `is_used = true`.
- **App responsibility:** generate/display the QR + code and reflect the `is_used` state on refresh. The app never marks vouchers used.

### 30.7 Vendor profile & services (vendor website → app)

- Vendor profile, services (`name`, `price`, `duration_minutes`, `active`, `points_reward`), branches, and ratings are authored on the website.
- The app reads only **public** fields of **approved** vendors and **active** services; KYC/bank/ID fields are never exposed to the app.
- Setting a service `active = false` removes it from app discovery while preserving historical bookings.

### 30.8 Business rules

- **BR-INT-1:** The app performs **no** vendor/manager/admin writes; all such operations occur on the website dashboard.
- **BR-INT-2:** Vendor-driven changes propagate to the app via Realtime (live) and/or next fetch (eventual); the app tolerates both.
- **BR-INT-3:** RLS is the shared boundary — the app's customer session can only read public vendor data and its own rows.
- **BR-INT-4:** Notification events bridge the two surfaces (vendor action → customer push/in-app, and vice-versa) per §29.

### 30.9 Acceptance criteria

- **AC-INT-1:** _Given_ a vendor sets a booking to `ready_for_pickup` on the website, _when_ it commits, _then_ the customer app timeline updates live and a "car ready" push is delivered.
- **AC-INT-2:** _Given_ a vendor blocks a day on the website, _when_ the customer next opens that center, _then_ no slots are offered for that day.
- **AC-INT-3:** _Given_ a customer redeems a voucher in the app, _when_ the vendor scans it on the website, _then_ the app shows it as used on next refresh and a second scan is rejected.
- **AC-INT-4:** _Given_ any vendor-only endpoint, _when_ called with a customer app session, _then_ it is rejected by RLS/role checks.

---

## 31. Cross-Cutting Requirements (NFRs)

### 36.1 Security

- RLS is the real authorization boundary; every BFF endpoint re-verifies the JWT + role.
- KYC docs in a private bucket with signed URLs; never public.
- Currently-unauthenticated `/api/bookings/*` notify endpoints must require the caller's JWT and authorize ownership before launch (see backend prerequisites).
- No service-role key in any client; no secrets in the app binary.

### 36.2 Performance

- Cold start < 2.5s to first meaningful paint; 60fps list scroll.
- Select only needed columns (avoid `select('*')` on wide tables); cursor pagination (page size 20) on search, bookings, customers, reviews, notifications, billing.
- Cache availability per vendor/day; cache static catalogs (categories, makes/models, rewards) with long TTL; stale-while-revalidate for vendor profiles/services.

### 36.3 Internationalization

- Full EN/AR with RTL mirroring; localized `*_ar` content fields; Cairo font (AR), Figtree (EN). All user-facing strings localized.

### 36.4 Reliability

- Atomic RPCs for points/billing; outbox/retry for queued writes; non-fatal notification handling; server is the source of truth for all money/points.

### 36.5 Observability

- Structured logging (no PII/tokens); crash + performance monitoring (Sentry/Crashlytics); breadcrumbs around booking and rewards flows.

---

## Appendix — Booking State Diagram (reference)

```
            ┌─────────┐  cancel  ┌───────────┐
 create ──▶ │confirmed│ ───────▶ │ cancelled │ (terminal)
            └────┬────┘          └───────────┘
                 │ check-in
                 ▼
            ┌──────────┐
            │checked_in│
            └────┬─────┘
                 │ start
                 ▼
            ┌───────────┐   need parts   ┌──────────────┐
            │in_progress│ ◀────────────▶ │ waiting_parts│
            └────┬──────┘                └──────┬───────┘
                 │ ready                         │ ready
                 ▼                               ▼
            ┌────────────────┐
            │ready_for_pickup│
            └───────┬────────┘
                    │ complete
                    ▼
              ┌──────────┐
              │completed │ (terminal) → award points + maintenance record + counter++
              └──────────┘
```
