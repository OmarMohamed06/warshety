# Garage (Warshety) — Flutter Mobile App Migration & Architecture Report

> **Single Source of Truth** for the production-grade iOS + Android Flutter application.
> Reverse-engineered from the existing Next.js 16 / React 19 / Supabase web platform.
>
> **Document status:** Complete architecture specification — no application code included.
> **Target platforms:** iOS 15+ and Android 8+ (API 26+).
> **Backend:** Reused as-is (Supabase Postgres + Auth + Storage, plus Next.js API routes for server-only logic).

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Complete Feature Inventory](#2-complete-feature-inventory)
3. [User Roles & Permissions](#3-user-roles--permissions)
4. [Authentication Analysis](#4-authentication-analysis)
5. [Database Architecture](#5-database-architecture)
6. [Supabase Analysis](#6-supabase-analysis)
7. [API & Backend Analysis](#7-api--backend-analysis)
8. [Screen Inventory](#8-screen-inventory)
9. [Mobile App Navigation Architecture](#9-mobile-app-navigation-architecture)
10. [Mobile UX Recommendations](#10-mobile-ux-recommendations)
11. [Design System Specification](#11-design-system-specification)
12. [Flutter Architecture Recommendation](#12-flutter-architecture-recommendation)
13. [State Management Map](#13-state-management-map)
14. [Storage & Offline Strategy](#14-storage--offline-strategy)
15. [Push Notification Architecture](#15-push-notification-architecture)
16. [Analytics Plan](#16-analytics-plan)
17. [Security Review](#17-security-review)
18. [Performance Requirements](#18-performance-requirements)
19. [Flutter Implementation Roadmap](#19-flutter-implementation-roadmap)
20. [Development Task Breakdown](#20-development-task-breakdown)
21. [AI Development Guide](#21-ai-development-guide)

- [Appendix A — Web → Flutter screen mapping](#appendix-a--web--flutter-screen-mapping-quick-reference)
- [Appendix B — Open items / backend prerequisites](#appendix-b--open-items--backend-prerequisites-for-mobile)
- [Appendix C — Orphaned remnants of the removed parts marketplace](#appendix-c--orphaned-remnants-of-the-removed-parts-marketplace)

---

## 1. Executive Summary

### 1.1 What the application does

**Garage** (product/brand name **Warshety** — Arabic: ورشتي, "my workshop") is an **automotive service-booking platform + lightweight vendor ERP** for the Egyptian market (Phase 1), with planned MENA expansion (Phase 2). It unifies two businesses into one ecosystem:

1. **Service-center booking** — customers find workshops, pick a service (oil change, brakes, AC, diagnostics, body repair, inspection, etc.), choose a vehicle from their garage, and book a date/time slot.
2. **Vendor dashboard (light ERP)** — service centers manage bookings, calendars/slots, services, branches, billing, reviews, and analytics.

A loyalty **rewards** program, **admin** moderation panel, **multi-branch** vendor support, **bilingual** (English + Arabic/RTL) UX, and SEO-first web presence round out the platform.

> **Scope note (parts marketplace removed):** A spare-parts marketplace (catalog, cart, checkout, orders, delivery via Bosta, card payment via Paymob) was previously part of the platform but has been **fully removed** from the user-facing application. This report covers the current **service-booking-only** scope. Orphaned database tables, types, SEO helpers, and integrations left behind by that removal are catalogued in **Appendix C** and must not be rebuilt in the mobile app.

### 1.2 Core business purpose

Become _"the Vezeeta for car service in Egypt."_ The platform solves trust and transparency problems in the Egyptian automotive service market:

- **The right workshop for your exact car** — the "My Garage" vehicle profile personalizes service discovery and maintenance history.
- **Transparent pricing** — published service prices.
- **Verified vendors** — manual admin KYC approval (commercial registration, national ID, bank details).
- **Verified reviews** — only customers with a completed booking can review.
- **Discovery** — programmatic SEO on web; in-app search and personalization on mobile.

**Monetization:** service-center per-booking fee (default 75 EGP) + monthly subscription (default 400 EGP), and featured-listing fees (default 200 EGP).

### 1.3 Main user journeys

1. **Customer — Book a service:** Add/select car → browse services or service centers → open center profile → pick service + vehicle → choose slot from calendar → confirm → receive SMS/email + in-app notification → track live status (8-state timeline) → service completed → earn loyalty points → leave a review.
2. **Customer — Redeem rewards:** Accumulate points from completed bookings → browse rewards catalog → redeem points for a service voucher (QR code) → present QR at vendor.
3. **Vendor — Onboard:** Multi-step application (business → location → operations → legal/KYC → bank → account) → admin review → approval email → dashboard access.
4. **Vendor — Operate:** Manage services & pricing → set working hours + block/open slots → accept and progress bookings through statuses → reply to reviews → view billing/invoices → submit bank-transfer payment → analytics.
5. **Branch manager — Operate a single branch:** Limited dashboard scoped to one branch (bookings, calendar, services, customers).
6. **Admin — Govern:** Approve/reject vendors → moderate reviews & complaints → manage pricing/commissions → manage rewards, promos, categories, vehicle catalog → oversee billing, payments, notifications.

### 1.4 User types and roles

| Role                        | DB enum                                              | Description                                                       |
| --------------------------- | ---------------------------------------------------- | ----------------------------------------------------------------- |
| **Customer**                | `customer`                                           | Car owner. Default role on sign-up.                               |
| **Vendor — Service Center** | `vendor` + `vendor_type = service_center`            | Workshop offering bookable services. The only active vendor type. |
| **Branch Manager**          | `manager` (app-level) / `branch_user_role = manager` | Operates a single assigned branch.                                |
| **Branch Owner**            | `branch_user_role = owner`                           | The vendor account that owns branches; can assign managers.       |
| **Admin**                   | `admin`                                              | Platform operator / moderator.                                    |

> **Mobile scope decision:** The Flutter v1 app targets **Customer**, **Vendor (service center)**, and **Branch Manager**. The legacy **`parts_seller`** vendor type still exists in the `vendor_type` enum but is **no longer used** — the parts marketplace was removed, so no parts-seller onboarding, inventory, or order flows exist. The **Admin** panel is data-heavy and desktop-oriented — keep it on web for v1 (document it here for completeness, ship a lightweight read-only admin view later if needed).

### 1.5 Primary value proposition

> _"Find the right workshop for your exact car — with transparent prices, verified vendors, real reviews, and rewards for every visit."_

- **For customers:** confidence (verified workshops), convenience (book in seconds), savings (transparent prices + loyalty points).
- **For vendors:** demand generation + a free lightweight ERP to run bookings and payouts.
- **For the platform:** per-booking fee + subscription + featured-listing revenue, plus a defensible data moat (reviews + garage profiles).

---

## 2. Complete Feature Inventory

> Legend — **Tables** reference §5; **Endpoints** reference §7; **Screens** reference §8. "Mobile rec." = recommended Flutter implementation.

### 2.1 Authentication & Account

| Field            | Detail                                                                                                                                                                                                             |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**      | Email/password + Google sign-in, registration, password reset, email verification, session management.                                                                                                             |
| **User benefit** | Secure personalized account; saved garage, bookings, orders, rewards.                                                                                                                                              |
| **Dependencies** | Supabase Auth; `users` trigger; Resend (reset email).                                                                                                                                                              |
| **Tables**       | `auth.users`, `users`                                                                                                                                                                                              |
| **Endpoints**    | `POST /api/auth/signout`, `GET /api/auth/set-session`, `POST /api/auth/forgot-password`, OAuth callback                                                                                                            |
| **Screens**      | Login, Register, Forgot password, Reset password, OAuth callback                                                                                                                                                   |
| **Mobile rec.**  | Supabase Flutter SDK with `flutter_secure_storage` session persistence. Native Google Sign-In (iOS/Android), deep-link password-reset via app links. Biometric unlock (Face ID / fingerprint) for returning users. |

### 2.2 My Garage (Vehicle Profiles) — _core engine_

| Field            | Detail                                                                                                                                                                                 |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Save vehicles (make, model, year, trim, engine code, transmission, mileage, plate). One "active" vehicle personalizes service discovery and maintenance history.                       |
| **User benefit** | Personalized services; full maintenance history per car.                                                                                                                               |
| **Dependencies** | `car_makes`/`car_models` catalogs.                                                                                                                                                     |
| **Tables**       | `vehicles`, `car_makes`, `car_models`, `maintenance_records`                                                                                                                           |
| **Endpoints**    | Direct Supabase CRUD (RLS-protected)                                                                                                                                                   |
| **Screens**      | Garage list, Add/Edit vehicle wizard, Vehicle detail + maintenance history                                                                                                             |
| **Mobile rec.**  | Stepped vehicle picker (Make → Model → Year → Trim → Engine). Persist locally for guests; sync to `vehicles` on auth. Active vehicle pinned in a global header chip. Offline-readable. |

### 2.3 Service-Center Discovery & Booking

| Field            | Detail                                                                                                                                                              |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Find service centers (directory, map, search), view profile (gallery, hours, services, ratings, reviews, branches), and book a service for a chosen vehicle + slot. |
| **User benefit** | Trusted workshop, transparent prices, instant booking.                                                                                                              |
| **Dependencies** | My Garage, availability/slots, working hours, reviews.                                                                                                              |
| **Tables**       | `vendors`, `vendor_branches`, `services`, `vendor_working_hours`, `slot_overrides`, `bookings`, `reviews`                                                           |
| **Endpoints**    | `POST /api/bookings/notify`; availability computed client/service-side                                                                                              |
| **Screens**      | Services directory, Service-center profile, Booking flow (service → vehicle → slot → confirm)                                                                       |
| **Mobile rec.**  | Map + list toggle (Google Maps SDK). Calendar slot picker as a bottom sheet. One active booking rule enforced. Push + SMS confirmation.                             |

### 2.4 Booking Lifecycle & Live Tracking

| Field            | Detail                                                                                                                                                      |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | 8-state booking status machine with immutable history timeline; cancel/reschedule rules; auto maintenance record + points on completion.                    |
| **User benefit** | Real-time transparency on car status.                                                                                                                       |
| **Dependencies** | Bookings, status history, notifications, rewards trigger.                                                                                                   |
| **Tables**       | `bookings`, `booking_status_history`, `maintenance_records`, `points_transactions`                                                                          |
| **Endpoints**    | `POST /api/bookings/notify-ready`, `/notify-completed`, `/award-points`; server action `notifyBookingConfirmedAction`, `notifyVendorCancelledBookingAction` |
| **Screens**      | My bookings, Booking detail + timeline                                                                                                                      |
| **Mobile rec.**  | Supabase Realtime subscription on the booking row + history for a live timeline. Vertical stepper UI. Deep-linkable from push.                              |

### 2.5 Loyalty Rewards

| Field            | Detail                                                                                                               |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Earn points per completed booking; redeem for service vouchers (QR).                                                 |
| **User benefit** | Tangible savings; retention.                                                                                         |
| **Dependencies** | Points trigger on booking completion; vendor `points_per_booking`.                                                   |
| **Tables**       | `users.total_points`, `points_transactions`, `rewards`, `user_rewards`                                               |
| **Endpoints**    | `GET /api/rewards/validate`, `POST /api/rewards/use`, `/redeem`                                                      |
| **Screens**      | Rewards dashboard, Reward detail/redeem, Voucher (QR) modal, Points history                                          |
| **Mobile rec.**  | Animated "gift box" hero, QR generation (`qr_flutter`), wallet-style voucher cards. Server-authoritative point math. |

### 2.6 Reviews & Ratings

| Field            | Detail                                                                                  |
| ---------------- | --------------------------------------------------------------------------------------- |
| **Purpose**      | 1–5 star + comment reviews tied to a completed booking; vendor reply; admin moderation. |
| **User benefit** | Trust + accountability.                                                                 |
| **Dependencies** | Bookings (verified-buyer gating), vendors.                                              |
| **Tables**       | `reviews` (unique per booking)                                                          |
| **Endpoints**    | Direct Supabase CRUD (RLS)                                                              |
| **Screens**      | Reviews section on center profile, Leave review (post-completion), Vendor reviews mgmt  |
| **Mobile rec.**  | Inline review composer after completion; photo upload to Storage; optimistic post.      |

### 2.7 Search (Unified)

| Field            | Detail                                                                                                    |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Global search across vendors and services with relevance ranking.                                         |
| **User benefit** | Fast discovery.                                                                                           |
| **Dependencies** | `searchService` ranking; vendor + service data.                                                           |
| **Tables**       | `vendors`, `services`                                                                                     |
| **Endpoints**    | Service-layer queries (consider a Postgres RPC / `pg_trgm` for mobile)                                    |
| **Screens**      | Search overlay/page with type tabs                                                                        |
| **Mobile rec.**  | Debounced search, recent searches local cache, type filters. Move ranking into a Supabase RPC for parity. |

### 2.8 Notifications (In-app + Outbound)

| Field            | Detail                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | In-app notification feed; outbound SMS/email (booking confirmations, reminders, car-ready, payment due).      |
| **User benefit** | Stay informed.                                                                                                |
| **Dependencies** | Resend (email), SMS provider (stub), rate limiting, dedup.                                                    |
| **Tables**       | `notifications`, `notification_log`                                                                           |
| **Endpoints**    | `/api/bookings/notify*`, `/api/cron/reminders`, `/api/jobs/*`                                                 |
| **Screens**      | Notification center                                                                                           |
| **Mobile rec.**  | **Add FCM push** (new) mapped from `notification_type`; deep links per type. Notification preferences screen. |

### 2.9 Maintenance History

| Field            | Detail                                                                   |
| ---------------- | ------------------------------------------------------------------------ |
| **Purpose**      | Auto-logged service history per vehicle (created on booking completion). |
| **User benefit** | Full car service record.                                                 |
| **Tables**       | `maintenance_records`                                                    |
| **Screens**      | Vehicle detail → history                                                 |
| **Mobile rec.**  | Timeline per vehicle; export/share PDF (future).                         |

### 2.10 Vendor Onboarding (KYC)

| Field            | Detail                                                                                                                                                 |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Purpose**      | Multi-step application: business → location (geo) → operations (hours/services) → legal (ID/commercial reg) → bank → account creation. Admin approves. |
| **User benefit** | Become a verified vendor.                                                                                                                              |
| **Dependencies** | `adminActions` server action (service-role), geo resolve, Storage uploads.                                                                             |
| **Tables**       | `vendor_applications`, `vendors`, `users`                                                                                                              |
| **Endpoints**    | Server actions `createVendorApplicationWithAccount`, `approveVendorApplication`, `rejectVendorApplication`, `resolveVendorLocation`                    |
| **Screens**      | Apply overview + 6 steps + status                                                                                                                      |
| **Mobile rec.**  | Resumable wizard (draft in local DB). Document capture via camera. Map pin picker.                                                                     |

### 2.11 Vendor Dashboard & Operations (ERP)

| Field            | Detail                                                                                                                                                            |
| ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | KPIs, bookings management (status machine), calendar/slot management, services CRUD, customers list, reviews mgmt, settings, branches, branch-manager assignment. |
| **User benefit** | Run the business from the phone.                                                                                                                                  |
| **Dependencies** | Bookings, services, working hours, slot overrides, branch users.                                                                                                  |
| **Tables**       | `vendors`, `services`, `bookings`, `vendor_working_hours`, `slot_overrides`, `vendor_branches`, `branch_users`, `reviews`                                         |
| **Endpoints**    | Branch-manager server actions; availability service; direct Supabase                                                                                              |
| **Screens**      | Dashboard, Bookings, Calendar, Customers, Services, Reviews, Settings, Branches, Branch managers                                                                  |
| **Mobile rec.**  | Operational-first mobile layout: today's bookings, quick status updates, slot toggles. Push for new bookings.                                                     |

### 2.12 Vendor Billing & Payouts

| Field            | Detail                                                                                                                     |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Auto-generated monthly billing for service centers (per-booking fee + subscription); submit bank transfer; admin verifies. |
| **User benefit** | Transparent fees.                                                                                                          |
| **Tables**       | `vendor_billing_settings`, `service_center_billing`, `payment_transactions`, `system_settings`                             |
| **Endpoints**    | `POST /api/vendor/billing/ensure`, `/submit-payment`, `GET /api/cron/billing`, `/api/jobs/payment-reminders`               |
| **Screens**      | Vendor billing, invoices                                                                                                   |
| **Mobile rec.**  | Invoice list + status; upload transfer receipt; payment reminders via push.                                                |

### 2.13 Admin Panel (web-first; documented)

| Field           | Detail                                                                                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**     | Vendor approval, user mgmt, bookings/complaints, reviews moderation, pricing/commissions, rewards/offers, billing/payments, notifications, vehicle catalog, settings, roles. |
| **Tables**      | All + `complaints`, `admin_broadcasts`, `system_settings`, `promo_codes`                                                                                                     |
| **Screens**     | Admin routes (see §8)                                                                                                                                                        |
| **Mobile rec.** | Out of v1 scope. Optional later: read-only approvals + complaints triage.                                                                                                    |

### 2.14 Blog / Content (SEO, web-first)

| Field           | Detail                                                                             |
| --------------- | ---------------------------------------------------------------------------------- |
| **Purpose**     | Bilingual automotive articles (brakes, oil, maintenance) with FAQ, related, share. |
| **Tables**      | Static JSON in `src/content/*` (no DB)                                             |
| **Screens**     | Blog list, article                                                                 |
| **Mobile rec.** | Optional in-app "Learn" tab rendering markdown; low priority for v1.               |

### 2.15 Internationalization (EN/AR + RTL)

| Field            | Detail                                                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| **Purpose**      | Full bilingual UX, RTL mirroring, localized content fields (`*_ar`).                                                            |
| **User benefit** | Native Arabic experience.                                                                                                       |
| **Dependencies** | `messages/en.json`, `messages/ar.json`.                                                                                         |
| **Mobile rec.**  | Flutter `intl` + ARB files (port the JSON). `Directionality` driven by locale; mirror icons; Cairo font for AR, Figtree for EN. |

---

## 3. User Roles & Permissions

> Source of truth: `UserRole` enum (`customer | vendor | admin | manager`), `vendor_type` (`service_center` — the only active value; `parts_seller` is legacy/unused), `branch_user_role` (`owner | manager`), and middleware route guards.

### 3.1 Customer

- **Permissions:** Manage own profile, vehicles, bookings, reviews (only for own completed bookings), rewards redemption.
- **Restrictions:** No access to vendor/admin areas. Cannot review without a completed booking. One active booking at a time.
- **Accessible screens:** Home, Search, Services (directory/profile/booking), Bookings + tracking, Garage, Rewards, Profile/Settings, Notifications.
- **DB access:** Read public services/reviews/categories; read/write own rows in `vehicles`, `bookings`, `reviews`, `user_rewards`, `points_transactions` (read), `maintenance_records`, `complaints`.
- **RLS implications:** All writes scoped by `user_id = auth.uid()`. Reads of services gated to active/approved rows.

### 3.2 Vendor — Service Center (`vendor` + `service_center`)

- **Permissions:** Manage own vendor profile, branches, services, working hours, slot overrides; view/update own bookings (status machine); reply to reviews; view billing & submit payment; assign branch managers; view customers who booked.
- **Restrictions:** Only own vendor's data (`get_my_vendor_id()`); cannot see other vendors' bookings/customers; cannot self-approve (admin gates `status`).
- **Accessible screens:** Vendor dashboard, Bookings, Calendar, Customers, Services, Reviews, Billing, Settings, Branches, Branch managers.
- **DB access:** Read/write `vendors` (own), `services`, `vendor_working_hours`, `slot_overrides`, `vendor_branches`, `branch_users` (as owner), `bookings` (own vendor), `reviews` (reply), `service_center_billing` (read), `vendor_billing_settings` (read).
- **RLS implications:** Policies use `vendor_id = get_my_vendor_id()` and `can_access_branch()`; status changes restricted to allowed transitions in app/service layer.

### 3.3 Branch Manager (`manager`)

- **Permissions:** Operate exactly one assigned branch — bookings (status updates), calendar/slots, branch services, branch customers.
- **Restrictions:** Scoped to `branch_id` via `branch_users`; cannot manage other branches, billing, vendor settings, or manager assignments.
- **Accessible screens:** Single tabbed branch dashboard (`/branch/[branchId]`).
- **DB access:** Read/write `bookings`, `services`, `slot_overrides`, `vendor_working_hours` for assigned branch only (via `can_access_branch()` / `get_my_branch_ids()`).
- **RLS implications:** Helper functions `get_my_branch_ids()`, `can_access_branch(uuid)`, `is_branch_owner(uuid)` enforce branch isolation.

### 3.4 Branch Owner (`branch_user_role = owner`)

- **Permissions:** Everything a service-center vendor can do **plus** assign/remove branch managers.
- **Restrictions:** Only own vendor's branches.
- **DB access:** Insert/delete `branch_users`; uses `assignBranchManager`/`removeBranchManager` server actions (service-role flips target user role to `manager`).

### 3.5 Admin (`admin`)

- **Permissions:** Full platform governance — approve/reject vendors, manage users, bookings, complaints, reviews, pricing/commissions, rewards, promos, categories, vehicle catalog, billing/payments, notifications, settings, roles.
- **Restrictions:** None at data level (RLS admin bypass via `get_my_role() = 'admin'`); destructive ops should require confirmation.
- **Accessible screens:** Admin routes (web-first).
- **DB access:** Full read/write on all tables via admin policies.
- **RLS implications:** Every table has an "admin full access" policy keyed on `get_my_role() = 'admin'`.

### 3.6 Permission Matrix (condensed)

| Capability                  | Customer | SC Vendor |   Manager   | Admin |
| --------------------------- | :------: | :-------: | :---------: | :---: |
| Manage own garage/vehicles  |    ✅    |    ✅     |     ✅      |  ✅   |
| Book a service              |    ✅    |    ✅     |     ✅      |  ✅   |
| Manage services & slots     |    –     |    ✅     | branch only |  ✅   |
| Update booking status       |    –     |    own    |   branch    |  ✅   |
| View billing/payouts        |    –     |    own    |      –      |  ✅   |
| Assign branch managers      |    –     |   owner   |      –      |  ✅   |
| Approve vendors             |    –     |     –     |      –      |  ✅   |
| Moderate reviews/complaints |    –     |   reply   |      –      |  ✅   |
| Platform settings/pricing   |    –     |     –     |      –      |  ✅   |

---

## 4. Authentication Analysis

### 4.1 Login methods

1. **Email + password** — `supabase.auth.signInWithPassword`. Special handling: unconfirmed email returns a `__email_not_confirmed__` sentinel so the UI can prompt "check your inbox."
2. **Google OAuth** — `supabase.auth.signInWithOAuth({ provider: 'google' })` → redirect to `/auth/callback`.
3. **Vendor logins** — same auth, but vendor portal has dedicated entry screens that branch by `vendor_type`. Vendors created via onboarding start with `email_confirm = false` and **cannot log in until admin approval** confirms the email.

### 4.2 Registration flow

- Customer: `supabase.auth.signUp` with metadata `{ full_name, role: 'customer' }` and `emailRedirectTo = /auth/callback`. A DB trigger (`on_auth_user_created` → `handle_new_user()`) auto-creates the `public.users` profile row.
- Vendor: not via public sign-up — uses the `createVendorApplicationWithAccount` server action (creates auth user with email unconfirmed + `vendor_applications` row).

### 4.3 Password reset flow

1. `POST /api/auth/forgot-password` with `{ email }`.
2. Server generates a Supabase recovery link (`auth.admin.generateLink`), then sends a **branded Resend email** (logo + button). Always returns success (no email enumeration).
3. Link → `/auth/reset-password` (mobile: deep link). `GET /api/auth/set-session` exchanges `access_token`/`refresh_token` from the recovery hash into a session, then the user sets a new password.

### 4.4 Email verification flow

- On sign-up, Supabase sends a confirmation email → link hits `/auth/callback?code=...` → `exchangeCodeForSession` → user marked confirmed. Unconfirmed users get the sentinel error on login.

### 4.5 OAuth providers

- **Google** (live). Architecture is provider-agnostic; Apple Sign-In should be **added for iOS App Store compliance** (required when offering third-party social login).

### 4.6 Session management

- **Web:** `@supabase/ssr` cookie-based sessions; middleware refreshes on each request; SSR pre-fetch hydrates `AuthContext` (no loading flash). Sign-out via `POST /api/auth/signout` (clears cookies server-side) + hard redirect.
- **Mobile (Flutter):** `supabase_flutter` with `flutter_secure_storage` for the refresh token; auto-refresh on resume; `onAuthStateChange` stream drives an `AuthController`. Roles/vendor/managed-branch resolved by the same 3 parallel queries used in `AuthContext.loadProfile` (`users`, `vendors`, `branch_users`).

### 4.7 Security requirements

- Enforce email confirmation before login; rate-limit sign-up and reset (already partially handled).
- Store tokens only in secure storage; never log tokens.
- Apple Sign-In on iOS; biometric re-auth for sensitive vendor actions (payout submission).
- All authorization decisions enforced by **RLS** server-side — the mobile client must never be the sole gate.
- Deep-link auth callbacks must validate state and be restricted to the app's registered scheme/Universal Links/App Links.

---

## 5. Database Architecture

> Postgres on Supabase. RLS enabled on **all** tables. The active schema spans ~40 tables across 11 domains. Below: every active table with purpose, key columns/types, relationships, constraints, indexes, RLS posture, and app usage. Enum catalog and ERD follow.
>
> **Legacy note:** Tables from the removed parts marketplace (`catalog_products`, `product_specifications`, `compatible_vehicles`, `oe_numbers`, `vendor_products` + children, `orders`, `order_items`, `addresses`, `wishlist`, `parts_seller_transactions`, `promo_codes`) still physically exist in the SQL migration files but are **orphaned and out of scope** for the mobile app. They are catalogued in **Appendix C** and intentionally excluded below.

### 5.1 Domain — Authentication & Users

#### `users` (extends `auth.users`)

- **Purpose:** App-level user profile + role + loyalty balance.
- **Columns:** `id uuid PK FK→auth.users ON DELETE CASCADE`, `email text NOT NULL`, `full_name text`, `phone text`, `avatar_url text`, `role user_role NOT NULL DEFAULT 'customer'`, `total_points int DEFAULT 0`, `created_at timestamptz DEFAULT now()`, `updated_at timestamptz DEFAULT now()`.
- **Relationships:** 1→N `vehicles`, `bookings`, `reviews`, `user_rewards`, `points_transactions`, `complaints`; 1→0..1 `vendors`; N→M branches via `branch_users`.
- **Triggers:** `on_auth_user_created` (auto-insert profile).
- **RLS:** own profile read/update; admin full.
- **Usage:** Drives `AuthContext` role routing.

### 5.2 Domain — Vendors & Service Centers

#### `vendors`

- **Purpose:** Service center business profile.
- **Key columns:** `id uuid PK`, `user_id FK→users`, `business_name`, `business_name_ar`, `vendor_type vendor_type` (always `service_center`), `status vendor_status DEFAULT 'pending'`, contact (`phone/email/address/city/city_ar/governorate/district`), geo (`latitude/longitude double precision`), media (`logo_url/cover_image_url`), legal (`commercial_reg_no/tax_id`), `description/description_ar`, `rating numeric(3,2)`, `total_reviews int`, `completed_bookings int`, `points_per_booking int`, `specializations text[]`, `supported_makes text[]`, `featured bool`, `featured_priority int`, `approved_at`, timestamps.
- **Indexes:** `idx_vendors_status`, `idx_vendors_type`.
- **Triggers:** `set_updated_at_vendors`.
- **RLS:** public read approved; own update; admin full.
- **Legacy columns:** Bosta pickup columns (`pickup_*`, `bosta_pickup_address_id`) remain from the removed parts delivery flow — unused.

#### `vendor_applications`

- **Purpose:** Onboarding form storage + admin review state.
- **Key columns:** business/owner/contact, geo, legal, ID URLs (`national_id_*_url`), bank (`bank_name/account_name/account_number/iban`), `working_days text[]`, `open_time/close_time`, `specializations/supported_makes text[]`, `shop_photos text[]`, `terms_accepted bool`, `step_completed int DEFAULT 1`, `status vendor_status`, `submitted_at/reviewed_at`, `reviewed_by FK→users`.
- **RLS:** applicant sees own; anyone can submit; admin manages.

#### `vendor_branches`

- **Purpose:** Multi-location support.
- **Key columns:** `vendor_id FK`, `name/name_ar`, address+geo, `phone`, `status text CHECK active|inactive`, `is_main bool`, timestamps. Index `idx_vendor_branches_vendor_id`.

#### `branch_users`

- **Purpose:** Branch-level manager assignment.
- **Key columns:** `user_id FK`, `branch_id FK`, `role branch_user_role DEFAULT 'manager'`, `assigned_by FK`, `created_at`. **PK (user_id, branch_id)**.
- **Helpers:** `get_my_branch_ids()`, `can_access_branch(uuid)`, `is_branch_owner(uuid)`.
- **RLS:** owner reads all for their branches; manager reads own; only owner insert/delete.

#### `vendor_billing_settings`

- **Purpose:** Per-vendor fee config.
- **Key columns:** `vendor_id PK`, `booking_fee numeric DEFAULT 75`, `subscription_fee DEFAULT 400`, `subscription_active bool`, `featured_listing_fee DEFAULT 200`, `featured_active bool`, audit. Trigger `set_updated_at`. (`commission_rate` column remains but is unused — legacy parts-seller commission.)

#### `vendor_working_hours`

- **Purpose:** Weekly schedule.
- **Key columns:** `vendor_id FK`, `day_of_week smallint CHECK 0-6`, `open_time/close_time time`, `is_open bool`. **UNIQUE (vendor_id, day_of_week)**. RLS: public read; vendor manage.

#### `slot_overrides`

- **Purpose:** Manual block/open of slots.
- **Key columns:** `vendor_id FK`, `date`, `time` (null = whole day), `type slot_override_type`, `note`. **UNIQUE (vendor_id, date, time)**. Index `idx_slot_overrides_vendor_date`.

### 5.3 Domain — Vehicles & Garage

#### `vehicles`

- **Purpose:** Customer garage.
- **Key columns:** `user_id FK`, `make/model text`, `year int`, `trim`, `engine_code`, `color`, `plate_number`, `mileage int`, `is_default bool`. RLS: own.

#### `maintenance_records`

- **Purpose:** Service history per vehicle (auto-created on booking completion).
- **Key columns:** `vehicle_id FK`, `user_id FK`, `booking_id FK ON DELETE SET NULL`, `service_type`, `description`, `mileage`, `service_date date`, `cost numeric`, `vendor_name`. Indexes on vehicle/user. RLS: own.

### 5.4 Domain — Services & Bookings

#### `services`

- **Purpose:** Bookable offerings.
- **Key columns:** `vendor_id FK`, `branch_id FK SET NULL`, `name/name_ar`, `description/description_ar`, `price numeric` (nullable = quote), `duration_minutes int`, `active bool`. Indexes on vendor/branch/active. RLS: public read active; vendor/manager manage.

#### `bookings`

- **Purpose:** Service appointments.
- **Key columns:** `user_id FK`, `vendor_id FK`, `branch_id FK SET NULL`, `vehicle_id FK`, `service_id FK` (deprecated), `service_key text`, `booking_date date`, `booking_time time`, `status booking_status DEFAULT 'booked'`, `booking_type booking_type DEFAULT 'inspection'`, `mileage`, `notes`, `total_price numeric`, timestamps.
- **Triggers:** `on_booking_status_change` (→ history), `on_booking_completed` (points + maintenance + vendor counter), `set_updated_at`.
- **Indexes:** user/vendor/status. RLS: own (customer) or vendor/branch or admin.

#### `booking_status_history`

- **Purpose:** Immutable audit timeline.
- **Key columns:** `booking_id FK`, `status booking_status`, `note`, `changed_by FK`, `changed_at`. Index on booking. RLS: anyone with booking access reads.

#### `reviews`

- **Purpose:** Verified-buyer reviews + vendor reply.
- **Key columns:** `booking_id FK UNIQUE`, `vendor_id FK`, `user_id FK`, `rating smallint CHECK 1-5`, `comment`, `vendor_reply`, timestamps. RLS: public read; user own write; vendor reply; admin full.

### 5.5 Domain — Billing & Payments

#### `payment_transactions`

- `reference_type payment_reference_type` (now effectively `booking` only), `reference_id`, `user_id FK`, `vendor_id FK SET NULL`, `amount`, `commission`, `net_to_vendor`, `method payment_method DEFAULT 'cod'`, `status payment_status DEFAULT 'pending'`, `gateway_ref`, `notes`, `processed_by`. Indexes user/vendor/status/reference.

#### `service_center_billing`

- `vendor_id FK`, `period_start/period_end date`, `bookings_count`, `booking_fee`, `total_booking_fees`, `subscription_fee`, `total_fees_due`, `payment_status billing_payment_status`, `payment_date`, `paid_by`, `notes`. **UNIQUE (vendor_id, period_start, period_end)**.

#### `system_settings`

- `key PK`, `value`, `description`, audit. Seeded keys for booking fees, subscription fees, featured-listing fees, bank-transfer details, maintenance_mode, etc. (Legacy parts/delivery keys remain but are unused.)

### 5.6 Domain — Rewards & Loyalty

#### `points_transactions`

- `user_id FK`, `points int` (+earn/−spend), `type points_transaction_type`, `reference_id`, `note`. Indexes user/created. RLS: own read; service insert.

#### `rewards`

- `title/title_ar`, `description/description_ar`, `points_required int`, `category reward_category`, `type reward_type` (service vouchers only), `image_url`, `value numeric`, `value_type` (fixed/percent), `is_active`. RLS: public read active; admin manage.

#### `user_rewards`

- `user_id FK`, `reward_id FK RESTRICT`, `code UNIQUE`, `qr_data`, `is_used bool`, `used_at`. Indexes user/code. RLS: own read; service insert/update.
- **Trigger:** `award_booking_points()` credits points on booking completion.

### 5.7 Domain — Notifications

#### `notifications` (in-app)

- `user_id FK`, `type notification_type`, `title`, `body`, `link`, `is_read bool`. Index (user, is_read). RLS: own.

#### `notification_log` (outbound SMS/email)

- `user_id FK SET NULL`, `channel notification_channel`, `event_type outbound_notification_type`, `recipient`, `provider_id`, `status notification_send_status`, `error_message`, `message_hash` (dedup), `sent_at`. Rate-limit index. RLS: service-role only.

### 5.8 Domain — Admin & Complaints

#### `complaints`

- `user_id FK`, `booking_id/vendor_id FK SET NULL`, `type complaint_type`, `subject`, `description`, `status complaint_status DEFAULT 'open'`, `admin_notes`, `resolved_by/resolved_at`. Indexes user/status/vendor. RLS: own read; admin full. (Legacy `order_id` column remains but is unused.)

#### `admin_broadcasts`

- `title`, `body`, `target broadcast_target`, `target_ids uuid[]`, `sent_by`, `sent_at`, `recipient_count`. RLS: admin only.

### 5.9 Domain — Taxonomy & Catalogs

#### `categories`

- `slug UNIQUE`, `name`, `parent_id FK self SET NULL` (hierarchical), `type text CHECK parts|service`, `icon`, `image_url`, `sort_order`, `active`. Indexes parent/type/slug. Service categories: 9 top-level (34 subs). (Legacy `parts`-type category seeds remain but are unused.)

#### `car_makes`

- `name UNIQUE`, `name_ar`, `logo_url`, `popular bool`. 15 popular makes seeded.

#### `car_models`

- `make_id FK`, `name`, `year_from int`, `year_to int`, `body_type`. **UNIQUE (make_id, name, year_from)**. Index on make.

### 5.10 Enum Catalog

> Enums marked _(legacy)_ remain in the database from the removed parts marketplace but are no longer produced by the application.

| Enum                         | Values                                                                                                                                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `user_role`                  | customer, vendor, admin (app adds `manager`)                                                                                                                                                                                                                             |
| `vendor_type`                | service*center (active), parts_seller *(legacy)\_                                                                                                                                                                                                                        |
| `vendor_status`              | pending, approved, suspended, rejected                                                                                                                                                                                                                                   |
| `booking_status`             | booked, confirmed, checked_in, in_progress, waiting_parts, ready_for_pickup, completed, cancelled (app also: no_show)                                                                                                                                                    |
| `booking_type`               | routine_maintenance, inspection                                                                                                                                                                                                                                          |
| `order_status` _(legacy)_    | pending, paid, shipped, completed, cancelled, processing, order_shipped_bosta, failed_delivery                                                                                                                                                                           |
| `payment_method`             | card, cod, wallet, bank_transfer                                                                                                                                                                                                                                         |
| `payment_status`             | pending, completed, failed, refunded, partially_refunded                                                                                                                                                                                                                 |
| `payment_reference_type`     | booking (order _(legacy)_)                                                                                                                                                                                                                                               |
| `billing_payment_status`     | pending, payment_submitted, paid                                                                                                                                                                                                                                         |
| `branch_user_role`           | owner, manager                                                                                                                                                                                                                                                           |
| `slot_override_type`         | blocked, opened                                                                                                                                                                                                                                                          |
| `notification_type`          | booking*confirmed, booking_cancelled, booking_status_changed, review_reply, vendor_approved, vendor_rejected, message_received (order_shipped, order_status_changed *(legacy)\_)                                                                                         |
| `notification_channel`       | sms, email                                                                                                                                                                                                                                                               |
| `notification_send_status`   | sent, failed                                                                                                                                                                                                                                                             |
| `outbound_notification_type` | booking*confirmed, booking_reminder, car_ready, new_booking_vendor, payment_due, payment_overdue, booking_cancelled, vendor_approved, vendor_rejected, booking_completed, application_received, vendor_booking_cancelled (order_confirmed, new_order_vendor *(legacy)\_) |
| `points_transaction_type`    | booking*reward, redeem_service, admin_adjustment (redeem_parts *(legacy)\_)                                                                                                                                                                                              |
| `reward_category`            | wash, detailing, protection, inspection, other (parts _(legacy)_)                                                                                                                                                                                                        |
| `reward_type`                | service*reward (parts_reward *(legacy)\_)                                                                                                                                                                                                                                |
| `complaint_status`           | open, investigating, resolved, closed                                                                                                                                                                                                                                    |
| `complaint_type`             | booking, vendor, payment, other (order _(legacy)_)                                                                                                                                                                                                                       |
| `discount_type`              | percentage, fixed                                                                                                                                                                                                                                                        |
| `broadcast_target`           | all_users, all_vendors, specific_users                                                                                                                                                                                                                                   |

### 5.11 ERD Description

**Hub entities:** `users`, `vendors`, `vehicles`, `bookings`.

- `auth.users` 1—1 `users` (trigger-created).
- `users` 1—N `vehicles`, `bookings`, `reviews`, `complaints`, `user_rewards`, `points_transactions`, `notifications`.
- `users` 1—0..1 `vendors` (`vendors.user_id`).
- `vendors` 1—N `vendor_branches`, `services`, `vendor_working_hours`, `slot_overrides`, `bookings`, `reviews`, `service_center_billing`; 1—1 `vendor_billing_settings`.
- `vendor_branches` N—M `users` via `branch_users`; 1—N `services`/`bookings` (optional `branch_id`).
- `vehicles` 1—N `bookings`, `maintenance_records`.
- `services` 1—N `bookings`.
- `bookings` 1—N `booking_status_history`; 1—0..1 `reviews`; 1—0..1 `maintenance_records`.
- `rewards` 1—N `user_rewards`; `users` 1—N `points_transactions`.
- `categories` self-referential (parent_id); `car_makes` 1—N `car_models`.

```
auth.users ─1:1─ users ─1:N─ vehicles ─1:N─ bookings ─1:N─ booking_status_history
                  │              │              │
                  │              │              ├─1:1─ reviews
                  │              │              └─1:1─ maintenance_records
                  ├─1:0..1─ vendors ─1:N─ services ──┘
                  │            ├─1:N─ vendor_branches ─N:M(branch_users)─ users
                  │            ├─1:1─ vendor_billing_settings
                  │            └─1:N─ service_center_billing
                  ├─1:N─ complaints / notifications
                  └─1:N─ points_transactions / user_rewards ─N:1─ rewards
categories (self parent_id) ; car_makes ─1:N─ car_models
```

---

## 6. Supabase Analysis

### 6.1 Auth

- **Providers:** Email/password + Google OAuth. Email confirmation enforced. Recovery via admin-generated link delivered by Resend.
- **Profile bootstrap:** `on_auth_user_created` trigger creates the `users` row from `auth.users` metadata (`full_name`, `role`).
- **Role resolution:** client reads `users.role`; if `vendor`, joins `vendors`; if `manager`, reads `branch_users.branch_id`.
- **Mobile:** use `supabase_flutter`; PKCE flow for OAuth; deep-link redirect for callbacks; secure storage for tokens.

### 6.2 Storage (Buckets)

- **`product-images`** (public) — legacy bucket from the removed parts catalog; retained but unused.
- **Needed buckets:** `vendor-docs` (national ID, commercial reg — should be **private** with signed URLs), `avatars`, `vendor-logos`/`covers`, `review-photos`, `shop-photos`. Action item: formalize buckets + RLS for uploads (owner-write, public-read for media, private+signed for KYC docs).
- **Mobile:** `image_picker` + compression before upload; resumable uploads for large galleries; signed URLs for private docs.

### 6.3 Edge Functions

- **None currently** — server-only logic lives in Next.js API routes/server actions. For mobile parity, server-only operations must remain reachable (keep Next.js API as a BFF, or port hot paths to Supabase Edge Functions). Candidates to port: billing generation, reminders, notification fan-out. See §7.

### 6.4 Realtime

- **Not yet used**, but high-value for mobile:
  - `bookings` + `booking_status_history` → live tracking timeline.
  - `notifications` → live in-app feed badge.
  - Vendor: new `bookings` inserts → instant job alerts.
- **Mobile:** subscribe via `supabase.channel()`; combine with FCM for background delivery.

### 6.5 Database Triggers

| Trigger                    | Table/Event                       | Action                                                                           |
| -------------------------- | --------------------------------- | -------------------------------------------------------------------------------- |
| `on_auth_user_created`     | `auth.users` AFTER INSERT         | Create `public.users` profile                                                    |
| `on_booking_status_change` | `bookings`                        | Insert into `booking_status_history`                                             |
| `on_booking_completed`     | `bookings` AFTER UPDATE           | Award points + create maintenance record + increment vendor `completed_bookings` |
| `trg_award_booking_points` | `bookings` AFTER UPDATE OF status | `award_booking_points()` credits `users.total_points` + audit row                |
| `set_updated_at_*`         | many                              | Maintain `updated_at`                                                            |

### 6.6 Cron Jobs (Vercel Cron, not pg_cron)

| Job                       | Schedule                  | Purpose                                       |
| ------------------------- | ------------------------- | --------------------------------------------- |
| `GET /api/cron/billing`   | `0 0 1 * *`               | Generate monthly service-center billing       |
| `GET /api/cron/reminders` | `0 9 * * *` (11:00 Cairo) | Customer SMS reminders + vendor daily summary |

> Manual job endpoints: `/api/jobs/booking-reminders`, `/api/jobs/payment-reminders` (Bearer `CRON_SECRET`). **Mobile note:** these stay server-side; the app only consumes their effects (push/in-app).

### 6.7 Policies (RLS)

- Pattern: per-row checks via `auth.uid()` and helper functions `get_my_role()`, `get_my_vendor_id()`, `get_my_branch_ids()`, `can_access_branch()`, `is_branch_owner()`.
- Admin bypass: `get_my_role() = 'admin'`.
- Public read: active services, reviews, working hours, active categories, car catalog.
- `fix_rls_policies.sql` wraps auth calls in `(SELECT ...)` for per-row performance.
- **Mobile reliance:** RLS is the real security boundary — the Flutter client uses the anon key and is fully governed by these policies.

### 6.8 RPC Functions (callable from client)

- `increment_user_points()` — atomic points add.
- `use_reward_code()` — atomic validate + mark used.
- `find_user_by_email()` — used by manager assignment (service-role).
- Plus internal: `handle_new_user`, `log_booking_status_change`, `set_updated_at`, `seed_vendor_working_hours`, `log_completed_booking_maintenance` (SECURITY DEFINER).
- **View:** `v_billing_summary` — admin billing aggregation.

---

## 7. API & Backend Analysis

> The web app uses **Next.js API routes + Server Actions** as a thin server layer over Supabase. For mobile, most data access is **direct Supabase (RLS-protected)**; only server-only operations (secrets, webhooks, cron, service-role) must be called via HTTP. **Recommendation:** keep the Next.js routes as a **Backend-for-Frontend (BFF)** the Flutter app calls for these specific operations.

### 7.1 Auth routes

| Endpoint                    | Method | Auth    | Purpose                            | Request → Response                            |
| --------------------------- | ------ | ------- | ---------------------------------- | --------------------------------------------- |
| `/api/auth/signout`         | POST   | session | Clear cookies server-side          | `{}` → `200`                                  |
| `/api/auth/set-session`     | GET    | none    | Exchange recovery tokens → session | `?access_token&refresh_token&next` → redirect |
| `/api/auth/forgot-password` | POST   | none    | Send reset email (Resend)          | `{email}` → `{ok:true}`                       |

### 7.2 Booking routes

| Endpoint                              | Purpose                                     | Request → Response                                      |
| ------------------------------------- | ------------------------------------------- | ------------------------------------------------------- |
| `POST /api/bookings/notify`           | Confirmation SMS+email to customer & vendor | `{bookingId}` → `{ok}`                                  |
| `POST /api/bookings/notify-ready`     | "Car ready" notice                          | `{bookingId}` → `{ok}`                                  |
| `POST /api/bookings/notify-completed` | Completion + points notice                  | `{bookingId}` → `{ok}`                                  |
| `POST /api/bookings/award-points`     | Award loyalty points (idempotent)           | `{bookingId, serviceTypeIds[]}` → `{ok, pointsAwarded}` |

### 7.3 Rewards routes

| Endpoint                          | Auth                 | Purpose                                                           | Request → Response                              |
| --------------------------------- | -------------------- | ----------------------------------------------------------------- | ----------------------------------------------- |
| `GET /api/rewards/validate?code=` | none                 | Validate code (QR landing), no consume                            | `?code` → reward info                           |
| `POST /api/rewards/use`           | vendor/admin/manager | Mark code used (atomic)                                           | `{code}` → `{success}`                          |
| `POST /api/rewards/redeem`        | customer             | Redeem points → service voucher code (atomic, retry on collision) | `{rewardId}` → `{code, qrData, pointsDeducted}` |

> The legacy `POST /api/rewards/promo` route (parts checkout discount) was removed along with the parts marketplace.

### 7.4 Vendor billing routes

| Endpoint                                  | Auth   | Purpose                                 |
| ----------------------------------------- | ------ | --------------------------------------- |
| `POST /api/vendor/billing/ensure`         | vendor | Generate missing billing rows on demand |
| `POST /api/vendor/billing/submit-payment` | vendor | Mark billing `payment_submitted`        |

### 7.5 Cron & jobs (server-only, Bearer `CRON_SECRET`)

- `GET /api/cron/billing`, `GET /api/cron/reminders`, `POST /api/jobs/booking-reminders`, `POST /api/jobs/payment-reminders`.

### 7.6 Server Actions

| Action file               | Functions                                                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `bookingActions.ts`       | `notifyVendorCancelledBookingAction`, `notifyBookingConfirmedAction`                                       |
| `geoActions.ts`           | `resolveVendorLocation` (geocode, hides Maps key)                                                          |
| `adminActions.ts`         | `createVendorApplicationWithAccount`, `approveVendorApplication`, `rejectVendorApplication` (service-role) |
| `branchManagerActions.ts` | `assignBranchManager`, `removeBranchManager`, `listBranchManagers`                                         |

> **Mobile parity:** server actions are not callable from Flutter. Expose them as REST endpoints in the BFF (e.g., `POST /api/vendor/applications`, `POST /api/admin/applications/:id/approve`, `POST /api/geo/resolve`, `POST /api/branches/:id/managers`). Protect with the user's Supabase JWT (verify server-side) and role checks.

### 7.7 Webhooks & external integrations

| Integration           | Status  | Notes                                                                                                                                                                                                               |
| --------------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Paymob** (payments) | removed | Was used only for parts checkout; the parts marketplace was removed. `lib/paymob.ts` may linger but is unused. No customer online-payment flow remains (bookings are pay-at-shop; vendor billing is bank transfer). |
| **Bosta** (delivery)  | removed | Parts delivery integration removed; schema/columns are orphaned (see Appendix C).                                                                                                                                   |
| **Resend** (email)    | live    | Reset, booking, vendor approval, reminders.                                                                                                                                                                         |
| **SMS provider**      | stub    | `sendSMS` logs to console; ready for Twilio/Vodafone.                                                                                                                                                               |

### 7.8 Error handling conventions

- Routes return `{ ok: true }` or `{ error: string }` with appropriate HTTP codes; notification calls are **fire-and-forget / non-fatal**. Rewards/billing use atomic RPCs to avoid race conditions. **Mobile:** wrap all calls in a typed `Result<T>`; treat notification failures as non-blocking; surface redeem errors clearly.

### 7.9 Environment variables (backend)

`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `RESEND_FROM_NAME`, `RESEND_FROM_EMAIL`, `GOOGLE_MAPS_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_SITE_URL`. (Legacy Paymob/Bosta secrets are no longer needed.) **Flutter** ships only `SUPABASE_URL` + `SUPABASE_ANON_KEY` (+ Maps key, FCM config); all secrets stay server-side.

---

## 8. Screen Inventory

> Page routes on web (+ layouts), grouped by area with mobile guidance. `[lang]` = en/ar. (The removed parts marketplace previously added catalog/cart/checkout/orders routes — those are gone.)

### 8.1 Public / Marketing

| Screen                            | Access | Data                                | Actions         | Mobile redesign                                                                 |
| --------------------------------- | ------ | ----------------------------------- | --------------- | ------------------------------------------------------------------------------- |
| Home `/`                          | public | featured centers, trust badges      | browse, add car | Personalized feed; active-vehicle hero; quick actions (Book, Services, Garage). |
| Services directory `/services`    | public | vendors, categories, ratings        | search/filter   | Map+list toggle; sticky filter sheet.                                           |
| Service center `/services/[slug]` | public | center, branches, services, reviews | book, review    | Tabbed (Overview/Services/Reviews/Hours); sticky Book CTA.                      |
| Blog `/blog`, `/blog/[slug]`      | public | static JSON                         | read, share     | Optional "Learn" tab; low priority.                                             |
| About `/about`                    | public | stats                               | —               | Simple scroll.                                                                  |
| Legal `/legal/terms`,`/privacy`   | public | static                              | —               | WebView/markdown.                                                               |

### 8.2 Auth

Login, Register, Forgot password, Reset password, OAuth callback, Vendor setup — **mobile:** single auth stack with native social buttons, deep-link reset, Apple Sign-In (iOS).

### 8.3 Customer

| Screen                                    | Data                     | Actions                     | Mobile                                 |
| ----------------------------------------- | ------------------------ | --------------------------- | -------------------------------------- |
| Garage `/garage`                          | vehicles                 | add/edit/delete, set active | Card list + FAB; stepped add wizard.   |
| Bookings `/bookings`                      | bookings (8 statuses)    | view, cancel, track         | Status-filtered tabs; pull-to-refresh. |
| Booking detail `/bookings/[id]`           | booking, timeline        | cancel, review              | Vertical stepper + Realtime.           |
| Profile `/profile`                        | profile, counts          | edit                        | Settings list.                         |
| Rewards `/rewards`                        | points, rewards, history | browse                      | Gift-box hero; wallet cards.           |
| Reward use `/reward/use`                  | rewards                  | redeem                      | QR voucher sheet.                      |
| Search `/search`                          | unified index            | search                      | Overlay + type tabs.                   |
| **(New for mobile)** Notifications center | per §2                   | manage                      | First-class screen (web has partial).  |

### 8.4 Services Booking Flow

Service-center → select service → select vehicle → select slot (calendar) → confirm → success. **Mobile:** 4-step bottom-sheet/full-screen flow with progress; enforce one active booking.

### 8.5 Vendor (service center)

- **Onboarding:** apply overview + form, location, operations, legal, bank, account, status. **Mobile:** resumable wizard + camera capture + map pin.
- **Dashboard:** dashboard, bookings, calendar, customers, services, reviews, billing, settings, branches, branch managers. **Mobile:** ops-first; today view; quick status; push alerts.

### 8.6 Branch Manager

`/branch/[branchId]` tabbed (Bookings / Calendar / Services / Customers) — **mobile:** bottom-tab scoped to the assigned branch.

### 8.7 Admin (web-first, documented)

Dashboard, users(+detail), service-centers(+detail), bookings(+detail), complaints, reviews, pricing, roles, billing, payments, rewards, offers, notifications, vehicles, settings. **Mobile:** excluded from v1; optional read-only approvals later.

### 8.8 Navigation relationships (web)

Layout nesting: Root → `[lang]` (header/footer) → {auth, garage, profile, vendor (sidebar), admin (sidebar), search}. Mobile flattens these into role-based navigators (see §9).

---

## 9. Mobile App Navigation Architecture

### 9.1 Role-based shells

Resolve `role` (+`vendor_type`/`managedBranchId`) at launch, then mount one of:

**A) Customer shell — Bottom Navigation (4 tabs):**

1. **Home** — discovery, active vehicle, quick actions.
2. **Services** — center directory + booking.
3. **Bookings** — active + past bookings with live tracking.
4. **Account** — profile, garage, rewards, become-vendor, settings.

**B) Vendor shell — Bottom Navigation (5 tabs):**

- Service Center: Dashboard · Bookings · Calendar · Reviews · More(services/customers/billing/branches/settings).

**C) Branch Manager shell — Bottom Navigation (4 tabs):** Bookings · Calendar · Services · Customers (scoped to branch).

### 9.2 Nested navigation

Each tab owns a `Navigator`/`StatefulShellBranch` (go_router) preserving stack state across tab switches. Detail pages (booking, center) push within the active branch. Modal flows (booking wizard, redeem) use root-level full-screen routes.

### 9.3 Authentication flow

- Splash → resolve session (secure storage) → if none: Auth stack (Login/Register/Forgot/Reset). If session: resolve role → mount shell.
- Guards via `go_router` `redirect`: unauthenticated → login (`?next=`); wrong role → home; unconfirmed email → verify prompt.

### 9.4 Deep linking strategy

- **Scheme + Universal/App Links:** `warshety://` + `https://warshety.com/...` mapped 1:1 to routes.
- Key links: `/bookings/:id`, `/services/:slug`, `/rewards`, `/reward/use?code=`, auth callback & reset.
- Reward QR landing (`/reward/use?code=`) opens validation screen.

### 9.5 Push notification navigation

Map `notification_type` / `outbound_notification_type` → destination:
| Type | Destination |
|---|---|
| booking_confirmed / status_changed / car_ready / completed | Booking detail (timeline) |
| booking_reminder | Booking detail (timeline) |
| review_reply | Center reviews / my review |
| vendor_approved / rejected | Vendor status / dashboard |
| new_booking_vendor | Vendor booking detail |
| payment_due / overdue | Vendor billing |
| message_received | (future) chat thread |

Cold-start: store payload, navigate after shell mounts. Warm: navigate immediately via root navigator key.

---

## 10. Mobile UX Recommendations

> Per feature: Keep / Change / Remove + mobile-first + platform notes.

### 10.1 My Garage

- **Keep:** active-vehicle-drives-everything model; stepped picker.
- **Change:** make active vehicle a persistent header chip; allow quick switch from anywhere.
- **Remove:** dense desktop tables.
- **Mobile-first:** offline-readable garage; image of car model; maintenance timeline.
- **iOS:** large-title nav, swipe-to-delete. **Android:** FAB add, Material swipe.

### 10.2 Service Booking

- **Keep:** 4-step flow, slot calendar, confirmation.
- **Change:** calendar as horizontal date strip + time chips; map for center location.
- **Remove:** sidebar booking widget pattern.
- **Mobile-first:** one active booking guard; haptic on confirm.
- **iOS:** `Cupertino` date picker option. **Android:** Material date/time pickers.

### 10.3 Booking Tracking

- **Keep:** 8-state timeline.
- **Change:** Realtime live updates; push deep-link.
- **Mobile-first:** vertical stepper, ETA, call-vendor button.

### 10.4 Rewards

- **Keep:** points earn/redeem, QR vouchers.
- **Change:** wallet-style cards; animated gift hero.
- **Mobile-first:** add to Apple/Google Wallet (future); QR brightness boost on display.

### 10.5 Reviews

- **Keep:** verified-buyer gating, vendor reply.
- **Change:** inline composer post-completion; photo upload.

### 10.6 Vendor Dashboard

- **Keep:** KPIs, status machine, slot mgmt.
- **Change:** "Today" operational view; quick status chips; push for new bookings.
- **Remove:** wide analytics tables → compact cards + charts.
- **iOS/Android:** platform charts via `fl_chart`.

### 10.7 Vendor Onboarding

- **Change:** resumable wizard, camera document capture, map pin, draft autosave.

### 10.8 Global

- **Keep:** full EN/AR + RTL.
- **Change:** native bottom nav vs web header; gestures; skeleton loaders; haptics.
- **Remove:** SEO-only constructs (programmatic landing pages) from app.
- **iOS:** SF-style transitions, Dynamic Type. **Android:** Material 3, edge-to-edge, predictive back.

---

## 11. Design System Specification

> Premium, minimal, energetic. Orange primary on near-white / near-black neutrals. Bilingual typography. Ported from `globals.css` (OKLCH) to a Flutter Material 3 theme.

### 11.1 Color system (light)

| Token                  | OKLCH                 | ~Hex                | Use            |
| ---------------------- | --------------------- | ------------------- | -------------- |
| background             | `oklch(1 0 0)`        | `#FFFFFF`           | screen bg      |
| foreground             | `oklch(0.145 0 0)`    | `#1A1A1A`           | text           |
| primary                | `oklch(0.63 0.22 35)` | `#F1592A`–`#FF6B35` | brand/CTA      |
| primary-foreground     | `oklch(1 0 0)`        | `#FFFFFF`           | on primary     |
| secondary/muted/accent | `oklch(0.97 0 0)`     | `#F5F5F5`           | surfaces       |
| muted-foreground       | `oklch(0.556 0 0)`    | `#8A8A8A`           | secondary text |
| border/input           | `oklch(0.922 0 0)`    | `#E5E5E5`           | dividers       |
| destructive            | `oklch(0.58 0.22 27)` | `#E5484D`           | errors         |
| ring                   | `oklch(0.708 0 0)`    | `#B5B5B5`           | focus          |

### 11.2 Color system (dark)

| Token      | OKLCH                 | Use             |
| ---------- | --------------------- | --------------- |
| background | `oklch(0.145 0 0)`    | dark bg         |
| card       | `oklch(0.205 0 0)`    | surface         |
| foreground | `oklch(0.985 0 0)`    | text            |
| primary    | `oklch(0.68 0.22 35)` | brighter orange |
| secondary  | `oklch(0.269 0 0)`    | surface alt     |
| border     | `oklch(1 0 0 / 10%)`  | hairline        |
| input      | `oklch(1 0 0 / 15%)`  | field           |

**Charts:** blue→purple ramp `oklch(0.809 0.105 251)` … `oklch(0.424 0.199 265)` (5 stops) for vendor analytics.

> Convert OKLCH→sRGB at build time; store as `Color` constants. Provide `lightColorScheme`/`darkColorScheme` for Material 3.

### 11.3 Typography

- **English / display:** **Figtree** (400–900).
- **Arabic / RTL:** **Cairo** (400–900).
- **Icons:** Material Symbols (use `material_symbols_icons` or bundle font).
- Flutter: select font family by `Directionality`/locale. Suggested scale: Display 28–34, H1 24, H2 20, Title 16–18, Body 14–16, Caption 12. Map to `TextTheme`.

### 11.4 Spacing

4-pt base grid: `4, 8, 12, 16, 20, 24, 32`. Cards: 16 padding / 16 gap (compact 12). Buttons: heights 28/32/36 (sm/md/lg). Screen gutters: 16.

### 11.5 Radius

Base `10px`. Scale: sm 6, md 8, lg 10, xl 14, 2xl 18, 3xl 22, 4xl 26. Components: buttons/inputs `lg(10)`, cards/modals `xl(14)`, sheets `2xl(18)` top corners.

### 11.6 Elevation

Minimal, soft shadows. Levels: 0 (flat surfaces), 1 (cards `y2 blur8 12% black`), 2 (sheets/menus `y8 blur24`), 3 (dialogs). Dark mode: prefer border hairlines over heavy shadows; optional glassmorphism (backdrop blur 10px) on overlays.

### 11.7 Components

- **Cards:** radius 14, padding 16, 1px border (light) / surface tint (dark); size variants default/compact.
- **Buttons:** variants `primary, secondary, outline, ghost, destructive, link`; sizes sm/md/lg; full-width on mobile CTAs; loading state with spinner; pressed haptic.
- **Inputs:** radius 10, 1px border, h36, focus ring (primary 50%), error ring (destructive); label above; helper/error below; RTL-aware alignment.
- **Modals (dialogs):** centered, radius 14, scrim 40%; for confirmations.
- **Bottom sheets:** primary mobile pattern for filters, pickers, actions; draggable; radius-2xl top; snap points.
- **Loading states:** skeletons (shimmer) for lists/cards; inline spinners for actions; never block whole screen unless first load.
- **Empty states:** illustration + title + subtitle + primary action (e.g., "No vehicles yet — Add your car").
- **Error states:** inline retry card; toast (via `sonner`-equivalent like `another_flushbar`/custom) for transient; full-screen error for fatal with retry.

### 11.8 Design language summary

Clean whitespace, 150ms transitions, one accent color, monochrome text hierarchy, hairline borders, large tap targets (≥44pt), RTL-first flexibility, subtle motion + haptics. Material 3 base with Cupertino touches on iOS where it improves feel.

---

## 12. Flutter Architecture Recommendation

### 12.1 Overview

**Clean Architecture (feature-first) + Riverpod + go_router + Supabase**. Layered: Presentation → Application (controllers) → Domain → Data. Chosen for testability, compile-safe DI, and a large mature ecosystem.

### 12.2 Folder structure

```
lib/
  main.dart
  app/                      # App widget, theme, router, localization bootstrap
    app.dart
    router/                 # go_router config, guards, deep links
    theme/                  # ColorScheme, TextTheme, component themes
    l10n/                   # ARB files (en/ar) generated localizations
  core/                     # cross-cutting
    config/                 # env, flavors, constants
    network/                # supabase client, BFF http client, interceptors
    error/                  # Failure, exceptions, Result<T>
    utils/                  # formatters (EGP), validators, extensions
    widgets/                # shared UI (buttons, cards, sheets, states)
    analytics/              # analytics + crash facade
    notifications/          # FCM + local notifications + routing
  features/
    auth/
      data/ (datasources, dtos, repositories impl)
      domain/ (entities, repository interfaces, usecases)
      application/ (controllers/providers, state)
      presentation/ (screens, widgets)
    garage/ services/ booking/ rewards/
    reviews/ search/ notifications/ profile/
    vendor/ (onboarding, dashboard, bookings, calendar, billing, branches)
    branch_manager/
  shared/                   # shared domain models reused across features
```

### 12.3 State management — **Riverpod** (`flutter_riverpod` + `riverpod_generator`)

- **Why:** compile-safe DI without `BuildContext`, fine-grained rebuilds, easy testing/overrides, async-first (`AsyncValue`), no boilerplate of BLoC for CRUD-heavy app. Streams (Supabase Realtime/auth) map cleanly to `StreamProvider`.
- Pattern: `AsyncNotifier`/`Notifier` controllers per feature; `ref.watch` repositories.

### 12.4 Data layer

- **Supabase Dart SDK** for direct table access (RLS-governed) + Storage + Realtime + RPC.
- **BFF HTTP client** (`dio`) for server-only endpoints (Paymob intention, webhooks status, billing ensure/submit, server actions ported to REST) with JWT auth header from the Supabase session.
- **DTOs** ↔ JSON via `freezed` + `json_serializable`; mappers to domain entities.
- **Local persistence:** `drift` (SQLite) for cart/garage/cache; `flutter_secure_storage` for tokens; `shared_preferences` for flags/locale.

### 12.5 Domain layer

- Pure Dart **entities** (`freezed`, immutable) and **repository interfaces**; optional **use-cases** for complex flows (createBooking with rules, redeemReward). Mirrors existing service-layer business rules (one active booking, slot conflict, reschedule lock, points math).

### 12.6 Presentation layer

- Screens are thin; read `AsyncValue` from controllers; render loading/empty/error/data states consistently. Shared widget kit implements the design system. `go_router` `StatefulShellRoute` for tabbed shells.

### 12.7 Dependency injection

- Riverpod providers as the DI graph: `supabaseProvider`, `dioProvider`, repository providers, controller providers. Override in tests with fakes. No service locator needed.

### 12.8 Routing

- **go_router** with typed routes, `redirect` guards (auth/role/email-confirm), deep-link + push integration, and `StatefulShellBranch` per bottom-nav tab. Root navigator key for modal/full-screen flows and push navigation.

### 12.9 Error handling

- `Result<T> = Either<Failure, T>` (or sealed `AsyncValue`). Map Postgrest/Auth/Storage exceptions → typed `Failure` (network, auth, permission/RLS, validation, payment). Non-fatal notification failures swallowed with log. Global error boundary + retry widgets.

### 12.10 Logging & observability

- `logger` package with levels; **Sentry** (or Firebase Crashlytics) for crashes + performance; never log PII/tokens. Breadcrumbs around payments/bookings.

### 12.11 Key packages

`supabase_flutter`, `flutter_riverpod`+`riverpod_generator`, `go_router`, `freezed`/`json_serializable`, `dio`, `drift`, `flutter_secure_storage`, `cached_network_image`, `image_picker`, `qr_flutter`, `mobile_scanner` (barcode/QR), `firebase_messaging`+`flutter_local_notifications`, `fl_chart`, `google_maps_flutter`, `intl`, `sentry_flutter`, `flutter_animate`.

---

## 13. State Management Map

| Feature                | State sources        | Local state              | Cached state                 | Remote state                                                        | Persistence                      |
| ---------------------- | -------------------- | ------------------------ | ---------------------------- | ------------------------------------------------------------------- | -------------------------------- |
| **Auth/session**       | Supabase auth stream | form fields              | role/vendor/branch in memory | `users`,`vendors`,`branch_users`                                    | secure storage (tokens)          |
| **Garage**             | local+DB             | add/edit form, active id | vehicles list                | `vehicles`                                                          | drift + secure prefs (active id) |
| **Services/centers**   | Supabase queries     | filters, map state       | directory, profiles          | `vendors`,`services`,`reviews`                                      | drift cache                      |
| **Availability/slots** | service-side calc    | selected date/time       | day slots                    | working hours + overrides + bookings                                | ephemeral                        |
| **Booking flow**       | controllers          | wizard step data         | —                            | `bookings` insert                                                   | draft in drift                   |
| **Booking tracking**   | Realtime             | —                        | timeline                     | `bookings`+`booking_status_history`                                 | ephemeral + push                 |
| **Rewards**            | DB + BFF             | redeem selection         | rewards, vouchers, history   | `rewards`,`user_rewards`,`points_transactions`,`users.total_points` | drift cache                      |
| **Reviews**            | DB                   | composer                 | center reviews               | `reviews`                                                           | ephemeral                        |
| **Notifications**      | Realtime + DB        | read toggles             | feed                         | `notifications`                                                     | drift mirror + badge             |
| **Vendor dashboard**   | DB                   | filters                  | KPIs, today bookings         | `bookings`,`services`,`vendors`                                     | drift cache                      |
| **Vendor calendar**    | DB                   | edits                    | hours/overrides              | `vendor_working_hours`,`slot_overrides`                             | drift cache                      |
| **Vendor billing**     | DB + BFF             | submit action            | invoices                     | `service_center_billing`                                            | drift cache                      |
| **Onboarding**         | local wizard         | all step fields          | —                            | `vendor_applications` (submit)                                      | drift draft (resumable)          |
| **Locale/theme**       | prefs                | toggles                  | —                            | —                                                                   | shared_preferences               |

---

## 14. Storage & Offline Strategy

### 14.1 Cached (read) data

Garage vehicles, service centers/profiles, categories, car makes/models, rewards catalog, user bookings summaries, notifications feed. Use **drift** with per-entity TTL and stale-while-revalidate.

### 14.2 Offline requirements

- **Fully offline-readable:** My Garage, last-loaded bookings, rewards/vouchers (QR works offline once issued).
- **Online-required:** booking creation, redeem (server-authoritative), availability, vendor writes.

### 14.3 Sync requirements

- **Garage:** guest local → on login, upsert to `vehicles` (dedupe by make/model/year/trim).
- **Cart:** local-first; reconcile prices/stock at checkout.
- **Outbox pattern** for queued writes (e.g., review draft, profile edits) retried on reconnect.

### 14.4 Conflict handling

- Server is source of truth. Last-write-wins for profile/garage; for bookings/redeem, never optimistic-commit money/points — confirm via server response. Detect stale stock/price at checkout and prompt re-confirm.

### 14.5 Local storage needs

- `flutter_secure_storage`: session tokens, optional biometric flag.
- `drift`: cache + cart + drafts + notifications mirror.
- `shared_preferences`: locale, theme, onboarding-seen, active vehicle id, push prefs.
- Cache size cap + LRU eviction for images (`cached_network_image` default + custom for catalog).

---

## 15. Push Notification Architecture

### 15.1 Provider

**Firebase Cloud Messaging (FCM)** for both platforms (APNs under the hood on iOS) + `flutter_local_notifications` for foreground display & scheduling.

### 15.2 Token lifecycle

On login/permission grant, store the FCM token in a new `device_tokens` table (`user_id`, `token`, `platform`, `locale`, `updated_at`, RLS own). Refresh on rotation; delete on sign-out.

### 15.3 Notification types & triggers

Map existing events (`notification_type` + `outbound_notification_type`) to push:
| Type | Trigger source | Audience |
|---|---|---|
| booking_confirmed | booking create (`/api/bookings/notify`) | customer + vendor |
| booking_status_changed / car_ready / completed | status update triggers | customer |
| booking_reminder | `/api/cron/reminders`, `/api/jobs/booking-reminders` | customer |
| new_booking_vendor | booking create | vendor/branch |
| review_reply | vendor reply | customer |
| vendor_approved / rejected | admin action | vendor |
| payment_due / overdue | `/api/jobs/payment-reminders` | vendor |
| broadcast | `admin_broadcasts` | targeted |

### 15.4 Deep-link destinations

See §9.5 mapping. Each push carries `{ type, entityId }`; the app routes via root navigator.

### 15.5 User preferences

Notifications settings screen: toggle categories (bookings, promos, reminders, vendor ops). Persist to a `notification_preferences` table (or JSON on `users`); honor server-side before sending.

### 15.6 Implementation plan

1. Add `device_tokens` table + RLS.
2. Add BFF send service (FCM Admin SDK) invoked from existing notify/cron endpoints alongside SMS/email.
3. Flutter: request permission (iOS provisional first), handle foreground/background/terminated, badge + channels (Android importance levels), localize payloads (EN/AR).
4. Respect rate-limit/dedup parity with `notification_log`.

---

## 16. Analytics Plan

### 16.1 Tooling

Firebase Analytics (or PostHog/Amplitude) + Crashlytics/Sentry, behind a thin `Analytics` facade so events are platform-agnostic.

### 16.2 Core events

| Event                                                            | Properties                    |
| ---------------------------------------------------------------- | ----------------------------- |
| `app_open`, `session_start`                                      | role, locale                  |
| `sign_up`, `login`                                               | method (email/google/apple)   |
| `add_vehicle`, `set_active_vehicle`                              | make, model, year             |
| `view_service_center`                                            | vendor_id                     |
| `start_booking`, `select_service`, `select_slot`, `book_service` | vendor_id, service_key, value |
| `booking_status_view`                                            | status                        |
| `leave_review`                                                   | rating                        |
| `redeem_reward`, `use_voucher`                                   | reward_id, points             |
| `vendor_status_update`, `vendor_add_service`                     | (vendor)                      |
| `notification_open`                                              | type, entityId                |

### 16.3 Funnels

- **Booking:** view center → start booking → select service → select slot → confirm → completed.
- **Vendor onboarding:** apply start → each step → submit → approved.
- **Rewards:** view rewards → redeem → use voucher.

### 16.4 Retention metrics

D1/D7/D30 retention, WAU/MAU, sessions/user, active-vehicle adoption, repeat-booking rate, notification opt-in rate.

### 16.5 Conversion metrics

Booking conversion (center view→booking), search→view, onboarding completion, reward redemption rate.

### 16.6 Business KPIs (PRD-aligned)

Booking volume, booking rate, repeat customers, CAC, LTV, vendor retention, organic-to-app conversion, average booking value, points liability.

---

## 17. Security Review

### 17.1 Authentication risks

- **Findings:** social login present (good); email confirmation enforced; reset avoids enumeration. **Gaps:** no Apple Sign-In (iOS policy), no MFA, no biometric gate.
- **Recommendations:** add Apple Sign-In; secure-storage tokens; biometric re-auth for payout/payment; short access-token TTL with refresh; jailbreak/root awareness for vendor money flows.

### 17.2 Authorization risks

- **Findings:** RLS-first with role helpers; manager scoping via `branch_users`. **Risk:** client must not be the only gate; role flips go through service-role actions.
- **Recommendations:** keep all authZ in RLS; verify JWT + role on every BFF endpoint; never expose service-role key to the app; audit branch isolation policies with tests.

### 17.3 Data exposure risks

- **Findings:** public reads for catalog/services/reviews are intended. **Risk:** over-broad `vendors`/`vendor_applications` reads could leak PII (phone, IDs, bank).
- **Recommendations:** column-level care — expose only public vendor fields to anon; keep `vendor_applications` (national ID, bank, tax) strictly applicant+admin; use views for public vendor data.

### 17.4 RLS issues

- **Findings:** `fix_rls_policies.sql` already optimizes per-row auth calls. **Recommendations:** add automated RLS test suite (each role tries cross-tenant read/write); confirm `notification_log` is service-role only; ensure new `device_tokens`/preferences tables get owner-only policies.

### 17.5 API vulnerabilities

- **Findings:** notify/award endpoints are **unauthenticated** (`/api/bookings/*`), relying on obscurity of booking IDs. **Risk:** enumeration/spam triggering SMS/email.
- **Recommendations:** require the caller's JWT and authorize (customer owns booking / vendor owns vendor); rate-limit; sign cron/job endpoints (already Bearer) and rotate `CRON_SECRET`; implement Paymob webhook with mandatory HMAC verify; implement Bosta webhook with signature/allow-list.

### 17.6 Storage vulnerabilities

- **Findings:** `product-images` public is fine. **Risk:** KYC docs (national ID, commercial reg) must never be public.
- **Recommendations:** private `vendor-docs` bucket + signed URLs + owner/admin RLS; validate content-type/size on upload; strip EXIF GPS from user photos; virus-scan (future).

### 17.7 General

HTTPS/TLS pinning for BFF (optional), no secrets in the binary, obfuscate release builds, enforce least privilege, PII minimization in analytics, GDPR/Egypt PDP compliance for data deletion (account delete cascades via FKs).

---

## 18. Performance Requirements

### 18.1 Heavy screens

- **Service center directory** (large lists + images + filters) — virtualize + paginate + image caching.
- **Service center profile** (gallery, services, reviews) — lazy tabs.
- **Vendor dashboard / billing / calendar** — aggregate queries + charts.
- **Search** — debounce + ranked queries.
- **Booking timeline** — Realtime, keep payload small.

### 18.2 Expensive queries

- Availability computation (working hours × overrides × existing bookings) — cache per vendor/day.
- Billing aggregation (`v_billing_summary`) — already a view; paginate.
- Global search ranking — move to a Postgres function for one round-trip.

### 18.3 Optimization opportunities

- `select` only needed columns (avoid `select('*')` on wide tables like `vendors`).
- Use `count: 'exact'` sparingly; prefer cursor pagination.
- Batch the 3 auth-bootstrap queries (already parallel).
- Precompute vendor `rating`/`total_reviews`/`completed_bookings` (already denormalized) — keep.
- Image transforms via Supabase image rendering / CDN sizes.

### 18.4 Pagination requirements

Cursor/range pagination on: search, bookings, vendor bookings, customers, reviews, notifications, billing. Page size 20; infinite scroll with prefetch.

### 18.5 Caching opportunities

- Static-ish: categories, car makes/models, rewards catalog (long TTL).
- Semi-static: vendor profiles, services (stale-while-revalidate).
- Per-session: garage, notifications (drift mirror + Realtime invalidation).
- Targets: cold start < 2.5s to first meaningful paint; list scroll 60fps; image decode off main isolate.

---

## 19. Flutter Implementation Roadmap

> Complexity scale: **S** (low), **M** (medium), **L** (high), **XL** (very high).

### Phase 1 — Foundation — _Complexity: L_

Project + flavors (dev/staging/prod), Material 3 theme (light/dark, OKLCH→RGB), Figtree/Cairo fonts, RTL + l10n (port `en.json`/`ar.json` → ARB), go_router shell scaffolding, Riverpod + DI, Supabase init, `dio` BFF client, drift + secure storage, shared widget kit (buttons/cards/inputs/sheets/states), error/Result + logging + Sentry, analytics facade, CI (build/test/lint).

### Phase 2 — Authentication — _Complexity: M_

Splash + session resolve, Login/Register/Forgot/Reset, Google + **Apple** sign-in, email-verification handling, deep-link auth callbacks, role resolution + guarded shells, profile bootstrap, biometric unlock (optional).

### Phase 3 — Core Features (Customer MVP) — _Complexity: XL_

My Garage (CRUD + active vehicle + offline), Service centers (directory/map/profile/reviews), Booking flow (service→vehicle→slot→confirm) + tracking timeline (Realtime), Rewards (earn/redeem/QR), Reviews, Notifications center + **FCM push**, Account/Profile/Settings.

### Phase 4 — Advanced Features (Vendor + Manager) — _Complexity: XL_

Vendor shell (service center), onboarding wizard (resumable + camera + map), dashboard/KPIs, bookings + status machine, calendar/slots, services CRUD, customers, reviews mgmt, billing + submit payment, branches + manager assignment, branch-manager shell.

### Phase 5 — Optimization — _Complexity: L_

Pagination + caching everywhere, image/perf tuning, Realtime tuning, offline/outbox hardening, search RPC, accessibility (Dynamic Type, TalkBack/VoiceOver, contrast), localization QA (RTL), crash/ANR triage, analytics funnels validation, security hardening (auth on notify endpoints, private KYC bucket, RLS tests).

### Phase 6 — Store Release — _Complexity: M_

App icons/splash, store listings (EN/AR), privacy nutrition labels + data-safety form, Apple Sign-In compliance, screenshots, TestFlight + Play internal testing, staged rollout, monitoring dashboards, support/feedback loop.

---

## 20. Development Task Breakdown

> Priority: P0 (blocker/MVP), P1 (important), P2 (nice-to-have). Order = recommended sequence.

### Foundation (Phase 1)

| #   | Task                                                                 | Deps | Priority | Complexity |
| --- | -------------------------------------------------------------------- | ---- | -------- | ---------- |
| 1   | Init repo, flavors, env config                                       | —    | P0       | S          |
| 2   | Material 3 theme + color tokens (OKLCH→RGB)                          | 1    | P0       | M          |
| 3   | Fonts (Figtree/Cairo) + TextTheme + locale font switch               | 2    | P0       | S          |
| 4   | l10n: port en/ar JSON → ARB + intl                                   | 1    | P0       | M          |
| 5   | RTL `Directionality` + locale controller                             | 3,4  | P0       | S          |
| 6   | Riverpod + DI graph                                                  | 1    | P0       | S          |
| 7   | Supabase client + auth stream provider                               | 6    | P0       | S          |
| 8   | BFF dio client + JWT interceptor + Result/Failure                    | 6,7  | P0       | M          |
| 9   | drift schema (cache/drafts) + secure storage                         | 6    | P0       | M          |
| 10  | go_router shells + guards skeleton                                   | 6    | P0       | M          |
| 11  | Shared widget kit (buttons/cards/inputs/sheets/empty/error/skeleton) | 2    | P0       | L          |
| 12  | Logging + Sentry + Analytics facade                                  | 6    | P0       | S          |
| 13  | CI/CD (build/test/lint, flavors)                                     | 1    | P1       | M          |

### Authentication (Phase 2)

| #   | Task                                    | Deps  | Priority | Complexity |
| --- | --------------------------------------- | ----- | -------- | ---------- |
| 14  | Splash + session resolve + role routing | 7,10  | P0       | M          |
| 15  | Login (email) + error states            | 11,14 | P0       | S          |
| 16  | Register + email-verify handling        | 15    | P0       | S          |
| 17  | Forgot/Reset (deep link + set-session)  | 15    | P0       | M          |
| 18  | Google + Apple sign-in                  | 15    | P0       | M          |
| 19  | Auth guards (role/email/next)           | 14    | P0       | S          |
| 20  | Biometric unlock (optional)             | 14    | P2       | S          |

### Customer Core (Phase 3)

| #   | Task                                         | Deps  | Priority | Complexity |
| --- | -------------------------------------------- | ----- | -------- | ---------- |
| 21  | Garage repo + entities + CRUD UI             | 9,19  | P0       | L          |
| 22  | Active vehicle state + header chip + offline | 21    | P0       | M          |
| 23  | Car makes/models picker (cached)             | 9     | P0       | M          |
| 24  | Service center directory + map               | 19    | P0       | L          |
| 25  | Service center profile (tabs + reviews)      | 24    | P0       | M          |
| 26  | Availability/slots service                   | 25    | P0       | L          |
| 27  | Booking flow wizard (rules enforced)         | 22,26 | P0       | L          |
| 28  | Booking list + detail + Realtime timeline    | 27    | P0       | L          |
| 29  | Rewards dashboard + redeem + QR voucher      | 19    | P1       | L          |
| 30  | Reviews composer (post-completion)           | 28    | P1       | M          |
| 31  | Notifications center + read state            | 19    | P1       | M          |
| 32  | FCM push + device_tokens + routing           | 31    | P0       | L          |
| 33  | Profile/Settings (locale/theme/notif prefs)  | 19    | P0       | M          |
| 34  | Global search (debounced + RPC)              | 23    | P1       | M          |

### Vendor & Manager (Phase 4)

| #   | Task                                         | Deps | Priority | Complexity |
| --- | -------------------------------------------- | ---- | -------- | ---------- |
| 35  | Vendor shell routing                         | 19   | P0       | M          |
| 36  | Onboarding wizard (resumable + camera + map) | 8,9  | P0       | XL         |
| 37  | Vendor dashboard KPIs + charts               | 35   | P0       | L          |
| 38  | Vendor bookings + status machine             | 35   | P0       | L          |
| 39  | Calendar working hours + slot overrides      | 35   | P0       | L          |
| 40  | Services CRUD                                | 35   | P0       | M          |
| 41  | Customers list                               | 38   | P1       | S          |
| 42  | Reviews mgmt + reply                         | 35   | P1       | M          |
| 43  | Vendor billing + submit payment              | 35   | P0       | M          |
| 44  | Branches CRUD + manager assignment (BFF)     | 35   | P1       | M          |
| 45  | Branch-manager shell (scoped)                | 44   | P1       | M          |

### Optimization & Release (Phases 5–6)

| #   | Task                                                                      | Deps    | Priority | Complexity |
| --- | ------------------------------------------------------------------------- | ------- | -------- | ---------- |
| 46  | Pagination/caching pass                                                   | core    | P0       | L          |
| 47  | Perf/image/Realtime tuning                                                | 46      | P1       | M          |
| 48  | Offline/outbox hardening                                                  | 9       | P1       | M          |
| 49  | Accessibility + RTL QA                                                    | all UI  | P0       | M          |
| 50  | Security hardening (auth notify endpoints, private KYC bucket, RLS tests) | backend | P0       | L          |
| 51  | Store assets + listings (EN/AR) + privacy forms                           | all     | P0       | M          |
| 52  | Beta (TestFlight/Play) + staged rollout + monitoring                      | all     | P0       | M          |

---

## 21. AI Development Guide

> Reusable prompt templates to build each screen/feature in Flutter while preserving the architecture in §12. Replace `<...>`. Always include the **System preamble**.

### 21.1 System preamble (prepend to every prompt)

```
You are building the Warshety Flutter app (iOS+Android, production).
Architecture: Clean Architecture, feature-first. State: Riverpod (riverpod_generator).
Routing: go_router with StatefulShellRoute. Backend: Supabase (RLS) + Next.js BFF (dio, JWT).
Models: freezed + json_serializable. Local: drift + flutter_secure_storage.
Design: Material 3, primary orange oklch(0.63 0.22 35), Figtree (EN)/Cairo (AR), RTL-aware,
radius lg=10/xl=14, 4pt spacing, skeleton/empty/error states, ≥44pt targets, 150ms motion.
Localize all strings (ARB en/ar). Enforce business rules from the migration report.
Return: domain entities, repository interface + Supabase impl, Riverpod controller (AsyncNotifier),
screen + widgets, and route registration. No secrets in app. Handle loading/empty/error.
```

### 21.2 Foundation prompts

- "Generate the Material 3 `ThemeData` (light+dark) from these tokens `<§11 colors>`, with Figtree/Cairo `TextTheme` selected by `Directionality`, and component themes for buttons/inputs/cards/sheets at radius lg=10/xl=14."
- "Create the go_router config with a `StatefulShellRoute` for the **customer** bottom nav (Home, Services, Bookings, Account), plus auth stack and guarded `redirect` for auth/role/email-confirm."
- "Set up Supabase + Riverpod providers (`supabaseProvider`, `authStreamProvider`, `dioProvider` with JWT interceptor) and a `Result<T>`/`Failure` error model mapping Postgrest/Auth exceptions."

### 21.3 Auth prompts

- "Build the Auth feature: entities (`AppUser`,`Role`,`VendorType`), `AuthRepository` (signIn/up, Google, Apple, reset, signOut, profile bootstrap via parallel `users`+`vendors`+`branch_users` queries), an `AuthController` (AsyncNotifier) exposing session+role, and Login/Register/Forgot/Reset screens with validation and the `__email_not_confirmed__` flow."

### 21.4 Garage prompt

- "Build My Garage: `Vehicle` entity, `GarageRepository` (local drift for guests, Supabase `vehicles` when authed, dedupe on login sync), `GarageController` with active-vehicle state persisted to prefs, a Garage list screen (cards + swipe delete + FAB), and a stepped Add/Edit wizard using `car_makes`/`car_models` (cached). Active vehicle must be readable offline and prefill the booking flow."

### 21.5 Services & booking prompts

- "Build Service Center directory (map+list toggle via google_maps_flutter, filter sheet) and profile (tabs: Overview/Services/Reviews/Hours) reading `vendors`/`services`/`reviews`/`vendor_working_hours`."
- "Build the Booking flow (service → active vehicle → slot → confirm). Implement availability from working hours × `slot_overrides` × existing `bookings`; enforce: no past dates, one active booking per user, routine_maintenance requires mileage, inspection requires notes, slot capacity. On success call BFF `/api/bookings/notify` and show confirmation."
- "Build Booking detail with a Realtime-subscribed vertical status timeline from `booking_status_history` and a post-completion review composer."

### 21.6 Rewards/reviews/notifications prompts

- "Build Rewards: dashboard (points balance, catalog), redeem via `/api/rewards/redeem` (server-authoritative), wallet voucher cards with `qr_flutter`, points history from `points_transactions`."
- "Build Notifications center from `notifications` (Realtime) + FCM integration: register `device_tokens`, handle foreground/background/terminated, localized payloads, deep-link by `{type, entityId}` per the report mapping."

### 21.9 Vendor prompts

- "Build the Vendor shell and onboarding wizard (business → location[map pin + BFF `/api/geo/resolve`] → operations → legal[camera capture to private `vendor-docs` bucket] → bank → account), resumable via drift draft, submitting to `vendor_applications`."
- "Build Vendor Bookings with the status state machine (`booked→confirmed→checked_in→in_progress→waiting_parts→ready_for_pickup→completed`/`cancelled`), Calendar (working hours + slot overrides), Services CRUD, and Billing (invoices + submit-payment via BFF)."
- "Build the Branch-Manager shell scoped to one `branch_id` (Bookings/Calendar/Services/Customers) honoring `can_access_branch` RLS."

### 21.10 Quality prompts

- "Add pagination + drift caching (stale-while-revalidate) to `<feature>` and replace `select('*')` with explicit columns."
- "Add golden + widget tests for `<screen>` covering loading/empty/error/data and RTL (ar) rendering."
- "Write RLS integration tests asserting `<role>` cannot read/write `<other-tenant>` rows."

---

## Appendix A — Web → Flutter screen mapping (quick reference)

- Web `/[lang]/garage` → Flutter `Account ▸ Garage` + add/edit wizard.
- Web `/services` + `/services/[slug]` → `Services` tab + center profile + booking modal.
- Web `/bookings(/[id])` → `Bookings` tab + detail timeline.
- Web `/rewards`,`/reward/use` → `Account ▸ Rewards` + voucher sheet.
- Web `/vendor/*` → Vendor shell tabs + More.
- Web `/branch/[branchId]` → Branch-Manager shell.
- Web `/admin/*` (18) → out of mobile v1 (web-first).

> The removed parts marketplace previously mapped to a `Parts` tab, `Wishlist`, and `Cart`/`Checkout`/`Orders` screens — these are intentionally **not** part of the mobile app (see Appendix C).

## Appendix B — Open items / backend prerequisites for mobile

1. Add auth to `/api/bookings/*` notify endpoints (currently unauthenticated).
2. Expose server actions as REST (vendor application, approve/reject, geo resolve, branch managers).
3. Add `device_tokens` + `notification_preferences` tables (+RLS) and FCM send in BFF.
4. Private `vendor-docs` storage bucket + signed URLs; formalize media buckets + RLS.
5. Optional: search RPCs/materialized views for single-round-trip mobile queries.
6. Add Apple Sign-In provider in Supabase Auth.

## Appendix C — Orphaned remnants of the removed parts marketplace

The spare-parts marketplace (catalog, cart, checkout, orders, delivery, card payment) was **removed from the user-facing application**, but artifacts remain in the codebase and database. They are **out of scope** for the mobile app and **must not be rebuilt**. Catalogued here so they are not mistaken for live features.

### C.1 Orphaned SQL / migration files

- `supabase/catalog_schema.sql`, `supabase/catalog_seed.sql` — master parts catalog.
- `supabase/vendor_products_schema.sql` — vendor (parts-seller) inventory.
- `supabase/vendor_pickup_schema.sql` — pickup/fulfillment for parts orders.
- `supabase/bosta_orders_schema.sql` — Bosta delivery integration for orders.

### C.2 Orphaned database tables

`catalog_products`, `product_specifications`, `compatible_vehicles`, `oe_numbers`, `vendor_products` (+ child tables), `orders`, `order_items`, `addresses`, `wishlist`, `parts_seller_transactions`, `promo_codes`. These physically exist but have no active UI/API surface in the current app.

### C.3 Orphaned enum values

- `vendor_type`: `parts_seller` (only `service_center` is active).
- `order_status`: all values (pending, paid, shipped, completed, cancelled, processing, order_shipped_bosta, failed_delivery).
- `notification_type`: `order_shipped`, `order_status_changed`.

### C.4 Orphaned application code

- `src/types/database.ts` — `DbProduct`, `DbOrder`, `DbOrderItem` (and related row types).
- `src/utils/seo.ts` — `buildProduct*` structured-data helpers for parts pages.
- `src/components/home/VehicleConfigurator.tsx` — a dead `/parts` link.
- Integration libs: `src/lib/paymob.ts` (card payment), any Bosta client — no longer wired to a live flow.

### C.5 Orphaned translation keys

Keys under parts/catalog/cart/checkout/orders/wishlist namespaces in `messages/en.json` and `messages/ar.json` are unused by the current UI.

> **Action for mobile:** ignore all of the above. Do **not** port parts browse, product detail, wishlist, cart, checkout, orders, Paymob, Bosta, or parts-seller onboarding/inventory into the Flutter app. If these tables/files are ever cleaned up server-side, this appendix can be deleted.
