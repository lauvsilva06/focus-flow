import assert from "node:assert/strict";
import test from "node:test";
import { getReviewState, nextReviewDate, reviewIntervalForCount } from "../src/lib/review.ts";
import { isSafeExternalUrl } from "../src/lib/url.ts";

test("review intervals progress predictably and cap at 30 days", () => {
  assert.deepEqual([0, 1, 2, 3, 4, 12].map(reviewIntervalForCount), [1, 3, 7, 14, 30, 30]);
});

test("next review uses the local calendar date", () => {
  assert.equal(nextReviewDate(new Date(2026, 7, 29, 23, 30), 0), "2026-08-30");
  assert.equal(nextReviewDate(new Date(2026, 7, 29, 8), 2), "2026-09-05");
});

test("review state distinguishes new, today, late and up to date", () => {
  const now = new Date(2026, 7, 29, 12);
  assert.equal(getReviewState(null, 0, now), "not_studied");
  assert.equal(getReviewState("2026-08-29", 1, now), "due_today");
  assert.equal(getReviewState("2026-08-28", 1, now), "overdue");
  assert.equal(getReviewState("2026-08-30", 1, now), "up_to_date");
});

test("external material URLs reject executable and malformed protocols", () => {
  assert.equal(isSafeExternalUrl("https://docs.example.com/topic"), true);
  assert.equal(isSafeExternalUrl("http://localhost:3000/lab"), true);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("data:text/html,test"), false);
  assert.equal(isSafeExternalUrl("not a url"), false);
});
