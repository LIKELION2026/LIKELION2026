import assert from "node:assert/strict";
import test from "node:test";

import {
  eventOccursOnDay,
  getMonthGridDays
} from "../src/features/virtual-office/model/calendar-display.ts";

test("shows an all-day event on every covered calendar day", () => {
  const result = eventOccursOnDay(
    {
      endsAt: new Date(2026, 7, 20).toISOString(),
      startsAt: new Date(2026, 7, 18).toISOString()
    },
    new Date(2026, 7, 19, 12)
  );

  assert.equal(result, true);
});

test("does not show an event after its end date", () => {
  const result = eventOccursOnDay(
    {
      endsAt: new Date(2026, 7, 20).toISOString(),
      startsAt: new Date(2026, 7, 18).toISOString()
    },
    new Date(2026, 7, 20, 12)
  );

  assert.equal(result, false);
});

test("builds a Sunday-first grid that includes the month edges", () => {
  const days = getMonthGridDays(new Date(2026, 7, 18));

  assert.equal(days[0]?.getDate(), 26);
  assert.equal(days[0]?.getMonth(), 6);
  assert.equal(days.at(-1)?.getDate(), 5);
  assert.equal(days.at(-1)?.getMonth(), 8);
  assert.equal(days.length, 42);
});
