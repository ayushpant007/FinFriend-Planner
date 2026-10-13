import assert from "node:assert/strict";
import test from "node:test";
import {
  getInvestmentProposalTitle,
  getReportPageRanges,
} from "@/lib/paginated-report-pdf";

test("builds a personalized proposal title from the entered name", () => {
  assert.equal(getInvestmentProposalTitle("  Surekh   Patel "), "Surekh Patel Investment Proposal");
  assert.equal(getInvestmentProposalTitle(""), "Investment Proposal");
  assert.equal(getInvestmentProposalTitle(null), "Investment Proposal");
});

test("uses nearby content boundaries without exceeding the printable page height", () => {
  assert.deepEqual(getReportPageRanges(2400, 1000, [950, 2050]), [
    { start: 0, end: 950 },
    { start: 950, end: 1950 },
    { start: 1950, end: 2400 },
  ]);
});

test("does not stretch a page to a safe boundary beyond the printable area", () => {
  assert.deepEqual(getReportPageRanges(2500, 1000, [1100, 2200]), [
    { start: 0, end: 1000 },
    { start: 1000, end: 2000 },
    { start: 2000, end: 2500 },
  ]);
});

test("moves a section that starts near the page bottom to the next page", () => {
  assert.deepEqual(getReportPageRanges(2300, 1000, [800, 1700], [{ start: 800, end: 1200 }]), [
    { start: 0, end: 800 },
    { start: 800, end: 1700 },
    { start: 1700, end: 2300 },
  ]);
});

test("reserves space for table headers on pages continuing a table", () => {
  const table = { start: 700, end: 2700, headerStart: 700, headerEnd: 780 };
  const ranges = getReportPageRanges(
    2800,
    1000,
    [700],
    [{ start: 700, end: 900 }],
    [table],
  );

  assert.deepEqual(ranges, [
    { start: 0, end: 700 },
    { start: 700, end: 1700 },
    { start: 1700, end: 2620 },
    { start: 2620, end: 2800 },
  ]);
  const renderedPageHeights = ranges.map((range) => {
    const continuesTable = table.start < range.start && table.end > range.start;
    return range.end - range.start + (continuesTable ? table.headerEnd - table.headerStart : 0);
  });
  assert.ok(renderedPageHeights.every((height) => height <= 1000));
});

test("does not force an oversized block to fit on a single page", () => {
  const ranges = getReportPageRanges(
    2500,
    1000,
    [750, 1200, 2000],
    [{ start: 500, end: 1800 }],
  );

  assert.deepEqual(ranges, [
    { start: 0, end: 750 },
    { start: 750, end: 1200 },
    { start: 1200, end: 2000 },
    { start: 2000, end: 2500 },
  ]);
  assert.ok(ranges.every((range) => range.end - range.start <= 1000));
});

test("falls back to complete page-sized slices when no safe boundaries exist", () => {
  assert.deepEqual(getReportPageRanges(2300, 1000, []), [
    { start: 0, end: 1000 },
    { start: 1000, end: 2000 },
    { start: 2000, end: 2300 },
  ]);
});

test("handles duplicate, out-of-range, and non-finite boundaries", () => {
  assert.deepEqual(getReportPageRanges(1000, 400, [-5, 0, 200, 200, 400, 900, 1000, 1200, NaN]), [
    { start: 0, end: 400 },
    { start: 400, end: 800 },
    { start: 800, end: 1000 },
  ]);
});
