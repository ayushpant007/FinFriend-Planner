import assert from "node:assert/strict";
import test from "node:test";
import { getReportPageRanges } from "@/lib/paginated-report-pdf";

test("uses nearby content boundaries for report pages", () => {
  assert.deepEqual(getReportPageRanges(2400, 1000, [950, 2050]), [
    { start: 0, end: 950 },
    { start: 950, end: 2050 },
    { start: 2050, end: 2400 },
  ]);
});

test("uses a safe boundary just beyond the page target instead of cutting a block", () => {
  assert.deepEqual(getReportPageRanges(2500, 1000, [1100, 2200]), [
    { start: 0, end: 1100 },
    { start: 1100, end: 2200 },
    { start: 2200, end: 2500 },
  ]);
});

test("falls back to complete page-sized slices when no safe boundaries exist", () => {
  assert.deepEqual(getReportPageRanges(2300, 1000, []), [
    { start: 0, end: 1000 },
    { start: 1000, end: 2000 },
    { start: 2000, end: 2300 },
  ]);
});
