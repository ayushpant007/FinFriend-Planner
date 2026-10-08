import assert from "node:assert/strict";
import test from "node:test";
import { parseExitLoadSchedule } from "@/lib/exit-load-schedule";

test("reads AMFI bullet text without losing a one-year rate", () => {
  const schedule = parseExitLoadSchedule(
    "Exit Load :l Exit load of 1.00% is payable if Units are redeemed within 1 year.\n" +
      "l No Exit Load is payable if Units are redeemed after 1 year.",
  );

  assert.deepEqual(schedule.map((entry) => entry.value), [
    "1.00% within 1 year",
    "1.00% within 1 year",
    "1.00% within 1 year",
  ]);
});

test("keeps comma-separated rates attached to their own periods", () => {
  const schedule = parseExitLoadSchedule("1% within 15 days, 0.5% after 15 days.");

  assert.equal(schedule[0].value, "1% within 15 days");
  assert.match(schedule[1].value, /0\.5% after 15 days/);
  assert.match(schedule[2].value, /0\.5% after 15 days/);
});

test("prefers the exit-load rate over an earlier unit-percentage threshold", () => {
  const schedule = parseExitLoadSchedule(
    "For redemption of up to 10% of units, an Exit Load of 1% applies within 1 year.",
  );

  assert.ok(schedule.every((entry) => entry.value === "1% within 1 year"));
});

test("recognizes HTML paragraph breaks and a later nil period", () => {
  const schedule = parseExitLoadSchedule(
    "<p>Exit Load: 0.75% within 90 days</p><p>Nil thereafter</p>",
  );

  assert.equal(schedule[0].value, "0.75% within 90 days");
  assert.equal(schedule[1].value, "0.75% within 90 days");
  assert.match(schedule[2].value, /No Exit Load thereafter/);
});

test("does not invent a rate when a clause mixes a charge and an exemption", () => {
  const schedule = parseExitLoadSchedule(
    "Exit load 1% within 1 year and no exit load on qualifying units.",
  );

  assert.ok(schedule.every((entry) => entry.status === "partial"));
  assert.ok(schedule.every((entry) => /condition that cannot be assigned/.test(entry.value)));
});

test("does not apply a unit-specific no-load exception to every time period", () => {
  const schedule = parseExitLoadSchedule(
    "No Exit Load for redemption of up to 10% of units.",
  );

  assert.ok(schedule.every((entry) => entry.status === "partial"));
  assert.ok(schedule.every((entry) => /see the original terms/.test(entry.value)));
});

test("does not treat an empty source as no Exit Load", () => {
  const schedule = parseExitLoadSchedule("");

  assert.ok(schedule.every((entry) => entry.value === "Not specified by source"));
  assert.ok(schedule.every((entry) => entry.status === "not-specified"));
});
