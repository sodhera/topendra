# TODOS

## Product

### Provider Credential Validation

**What:** Verify the Google and Facebook provider credentials configured in Supabase with a device-level OAuth smoke test.

**Why:** The app code and redirect URLs are wired, but provider-side configuration still needs a real end-to-end confirmation before shipping.

**Effort:** S
**Priority:** P1

### Search And Filters

**What:** Add simple map search and basic filtering for nearby places.

**Why:** The current browse experience is pin-first, but there is still no search box or filter surface.

**Effort:** M
**Priority:** P2

## Completed

### Real Authentication And Backend Sync

**What:** Replaced the demo login prototype with Supabase-backed auth, data sync, seeded pins, and auth-gated comments.

**Why:** The app now needs shared place data, comment privacy, and a real login mechanism.

**Completed:** 2026-03-22
