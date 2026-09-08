# CARPOOL OS V1 — Implementation Plan

Built exactly to the master specification: a two-sided recurring carpool marketplace (drivers offer seats, passengers find and book), Noida demo data, INR pricing, mobile-first PWA on Lovable Cloud (PostgreSQL + Auth + server functions). No extra features, no mock workflows.

## Resolved decisions
- Sign-in: email + password and Google. Mobile-number OTP sign-in will be wired if the SMS provider can be enabled in Cloud auth settings; otherwise phone stays a verified profile field and I report it as incomplete.
- New signups are signed in immediately (no email confirmation).
- Locations: free-text address with OpenStreetMap lookup for coordinates.
- Currency INR; all demo places in Noida.
- GitHub: not connected to this workspace from chat. Lovable keeps version history per change; connect GitHub in Project Settings and it will sync automatically.

## Build order (strict)

### 1. Schema + RLS
All 11 tables with the exact fields from the spec (profiles, vehicles, routes, rides, bookings, trips, ratings, reports, notifications, payments, admin_audit_logs), UUID keys, foreign keys, CHECK constraints on statuses/scores/seats, indexes on lookups (ride date/status, booking ride/passenger, notifications user/read). Separate `user_roles` table with `has_role()` for admin — never a role column trusted from the client. Trigger creates a profile on signup. RLS per spec: own profile, own vehicles/rides/routes, own bookings, drivers see bookings on their rides, ratings only for completed-trip participants (unique per trip + from user), any signed-in user can file a report, admin operations server-enforced. Suspended drivers blocked from creating active rides at the database level.

### 2. Auth
Sign up / log in / log out / password reset, Google sign-in, session-aware header, protected area under `/app`.

### 3. Profiles
Edit name, gender, phone, email, photo (cloud storage bucket), see verification status, rating, reliability score.

### 4. Driver workflow
Vehicle add/edit (make, model, year, registration, capacity). Ride create/edit/publish/cancel with origin, destination, date, departure time, recurring days, seats, price. Driver ride cards show date/time/origin/destination/seats/passengers/price/status. Incoming bookings: accept/reject. Earnings/settlements/history from real payment records.

### 5. Passenger workflow
Search by origin/destination/date/time. Result cards show driver (photo, rating, verification), vehicle, seats, price. Ride detail, request/book, booking list by upcoming/active/completed/history, cancel, payment history.

### 6. Matching service
Standalone module (`src/lib/matching/`) — pure deterministic functions, no AI. Hard filters: active ride, seats available, driver not suspended, date compatible, departure within configurable time tolerance, origin/destination within configurable radius. Ranking: route similarity, pickup proximity, destination proximity, time difference, reliability, rating — weights in one config object. Reused by search and by ride suggestions.

### 7. Transaction-safe booking
A single database function locks the ride row, validates status and seats, decrements seats, creates booking + pending payment record, and inserts the driver notification — all in one transaction. Concurrent last-seat requests: exactly one succeeds. Accept/reject/cancel restore seats the same way.

### 8. Trip lifecycle
scheduled → active → completed, or → cancelled. Transitions enforced in the database; completed trips cannot be reactivated. Cancellations store status + timestamp. Completing a trip marks bookings completed and sends rating reminders.

### 9. Ratings, reports, block, SOS, support
Rating 1–5 with optional review, reciprocal, only after completion, no duplicates; profile rating recalculated deterministically. Reliability score = deterministic formula from completed vs cancelled trips/bookings. Report a user (category, description). Block a user (blocked users excluded from matching and booking). SOS button shows emergency contact actions and logs the event. Support page with contact form stored as a report of category `support`.

### 10. Admin
Admin routes gated by server-verified role. Searchable tables for users, drivers/passengers, vehicles, rides, bookings, trips, payments, reports. Suspend/unsuspend, resolve reports, basic metrics dashboard. Every admin action written to `admin_audit_logs`.

### 11. Test / fix
Run the 25 acceptance scenarios end-to-end in a real browser against the preview with the demo accounts (signup, profile, vehicle, ride, search, book, concurrent last seat, accept/reject, cancel, start/complete, ratings, duplicates blocked, reports, suspend, admin authorization, RLS isolation). Only verified outcomes reported.

### 12. Polish
Loading/empty/error/success states, PWA manifest + icons, head metadata per page, responsive check on mobile widths.

## Demo data
Seeded via migration and clearly marked `[DEMO]`: 6 users (3 drivers, 2 passengers, 1 admin), vehicles, Noida routes (e.g. Sector 62 → Sector 18, Sector 137 → Film City), rides, bookings, completed trips with ratings, and test accounts `demo.driver1@carpool.local`, `demo.passenger1@carpool.local`, `demo.admin@carpool.local` (passwords shared in the final report; development only).

## Payments
Provider-independent payment service creating real `payments` rows in `pending` status at booking with platform fee computed; no fake success. Clearly labelled "payment integration pending" in the UI until a provider is confirmed.

## Technical notes
- Stack: TanStack Start (React 19 + TypeScript), Tailwind v4, shadcn, Lovable Cloud. All writes that need authority go through server functions or SECURITY DEFINER database functions; the browser client only uses the publishable key under RLS.
- Design: calm, trustworthy palette (deep teal primary, warm neutral surfaces), no gradients, one display font + one body font, large touch targets, bottom navigation on mobile with Find a Ride / Offer a Ride as primary actions.

## Out of scope (per spec)
AI/chatbot, corporate, subscriptions, guaranteed commute, backup automation, ads, loyalty, insurance, EV, native apps, nationwide, dynamic pricing, penalties.

## Final report will include
Schema and RLS summary, feature completion list, bugs found/fixed, the 25 scenario results, GitHub status, preview URL, deployment status, and all incomplete items.
