# Progress Log

Working log for feature work on `feature/clinic-staff-support`. Newest entry first.

---

## 2026-07-23 — Superadmin Dashboard: statistics, revenue & payment tracking

**Status:** Code complete, verified locally via Docker, not yet committed.

### What shipped

Requested features, all delivered:
- Clinic Management / Individual User Management — tenant table now has All/Clinics/Individuals tabs, retitles itself accordingly
- Total Payments, Successful/Pending/Failed Payments, Total Revenue — new Payments breakdown row + Dashboard Statistics hero row
- Active/Trial/Expired Subscriptions — new Subscriptions breakdown row (also added Suspended, a 4th real status, so the counts always sum to total tenants instead of silently dropping suspended accounts)
- Recent Payment History — new table, last 20 submissions across every tenant, any status, with its own local status filter
- Dashboard Statistics (Clinics, Individuals, Revenue & Payments) — 4-tile gradient hero row at the top

### Backend

- `GET /api/v1/superadmin/dashboard/stats` (new) — `SuperAdminController` → `SuperAdminService.getDashboardStats()`
- New DTOs: `PaymentHistoryEntryDto`, `SuperAdminDashboardStatsDto`
- `PaymentSubmissionRepository`: added `countByStatus`, `findTop20ByOrderByCreatedAtDesc`, `sumAmountClaimedByStatus`
- Subscription/tenant counts are derived from the same live-status computation `listTenants()` already used (`SubscriptionService.getStatus`), so the new stat tiles can never drift from the existing Tenants table
- No new entity fields or DB columns — no migration step needed (see DEPLOY.md's note on `ddl-auto=update` limitations, doesn't apply here)

### Frontend (`app/superadmin/dashboard/page.tsx`)

Went through two design passes based on feedback:
1. First pass: functional stat tiles, flat `soft-card` style — user feedback: "functions are good, UI looks bad, no design sense"
2. Second pass: full redesign —
   - Dashboard Statistics row → gradient hero cards (added 2 new gradient variants, `--grad-3` teal / `--grad-4` amber, to `globals.css`, rounding out the existing 2-gradient system to 4)
   - Subscriptions/Payments rows → `soft-card` + spotlight cursor-glow + watermark icon + progress-meter bar (reusing the exact pattern from the main practitioner dashboard's "Progress row", for visual consistency)
   - All stat tiles are clickable — jump to and pre-filter the relevant table below (e.g. clicking "Active" filters the tenant table to `ACTIVE` and scrolls to it)
   - Consistent icon-badge section headers across every section
   - Staggered mount-in animation (tiles cascade via existing `.d1`–`.d6` delay classes)
3. Follow-up fix: the first meter-bar attempt used a floating `%` chip that visually overlapped the corner watermark icon (caught from a screenshot) — replaced with the dashboard's proven meter-track/meter-fill bar instead

### Verification performed

- `tsc --noEmit`, `next lint`, `next build` all clean after every change
- Full stack run via `docker compose up --build` (backend + Postgres + frontend)
- Logged in as superadmin via the real API, hit `/superadmin/dashboard/stats` directly, cross-checked its counts against `/superadmin/tenants` — exact match (7 clinics + 4 individuals = 11 = total; 3 active + 8 trialing = 11)
- Caught and fixed two real bugs during review, before they shipped:
  - `COALESCE(SUM(...), 0)` in JPQL mixing a `BigDecimal` column with an integer literal — known Hibernate type-coercion trap, can throw `ClassCastException` at runtime. Replaced with a plain `SUM` + null-check in Java.
  - An incomplete optional chain (`?.label.toLowerCase()`) in the Recent Payment History empty-state text that would throw if the lookup ever missed.

### Security review (this session)

Ran a full branch-diff security review (feature/clinic-staff-support vs main — covers both the earlier clinic/staff commit and this session's dashboard work). **No high-confidence security findings.** Tenant isolation, staff-permission scoping, and the superadmin `@PreAuthorize` gate all held up against every new code path; no injection, no auth bypass, no cross-tenant leakage.

One **non-security bug** surfaced and independently verified during the review, logged here for visibility — **not fixed, out of scope of this session's work**:
- `AppointmentService.convertDemoToAppointment` (part of the earlier, already-committed clinic feature) passes `tenantId` instead of the caller's own id as the fallback into `StaffResolutionService.resolveTenantStaffId`, so converting a demo call to an appointment always attributes it to the clinic owner rather than the staff doctor who actually did the conversion — wrong billing rate, wrong slot-conflict scoping, wrong clinical record attribution. Fix: thread `currentUserProvider.getCurrentUserId()` through the controller → service call, mirroring `scheduleManually`/`recordPastSession` in the same file.

### Not yet done

- Nothing committed yet — all changes are still working-tree modifications
- The `convertDemoToAppointment` bug above, if you want it fixed
