# TODOS

## Product

### Duplicate Detection And Place Merge Tooling

**What:** Add duplicate-detection and merge tooling for places so moderators can reconcile near-identical listings into one canonical place.

**Why:** Founder seeding, user submissions, optional photos, and trusted-user live edits will eventually create near-duplicate places unless moderators have a way to detect and merge them.

**Context:** The eng review flagged duplicate submissions as a likely workflow issue for Topey. Thin-slice v1 can launch with manual moderator judgment, but once submissions rise the map will drift if multiple copies of the same cafe or venue accumulate with different names, pins, or conversations. The future tool should help moderators spot likely duplicates, compare structured place facts, preserve the canonical Place record, and decide what happens to attached conversation/history after a merge.

**Effort:** M
**Priority:** P2
**Depends on:** Canonical `Place` model, separate submission/revision records, and moderator workflows

## Completed
