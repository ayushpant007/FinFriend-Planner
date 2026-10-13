import assert from "node:assert/strict";
import test from "node:test";
import { removeRepeatedPmsReturnColumns } from "./pms-report-rendering";

test("removes a repeated PMS return horizon from a later source table", () => {
  const tables = [
    [
      ["Fund", "Since inception return"],
      ["Example Fund", "18.87%"],
    ],
    [
      ["Strategy", "Returns SI (CAGR)", "Manager"],
      ["Example Fund", "18.870%", "A. Manager"],
    ],
  ];

  assert.deepEqual(removeRepeatedPmsReturnColumns(tables), [
    tables[0],
    [
      ["Strategy", "Manager"],
      ["Example Fund", "A. Manager"],
    ],
  ]);
});

test("keeps a return column when its value differs or the horizon is distinct", () => {
  const tables = [
    [
      ["Fund", "Since inception return"],
      ["Example Fund", "18.87%"],
    ],
    [
      ["Fund", "Returns SI (CAGR)", "1 year return"],
      ["Example Fund", "17.20%", "12.50%"],
    ],
  ];

  assert.deepEqual(removeRepeatedPmsReturnColumns(tables), tables);
});

test("does not change tables without repeated return values", () => {
  const tables = [
    [["Fund", "1 year return"], ["Example Fund", "12%"]],
    [["Fund", "3 year return"], ["Example Fund", "15%"]],
  ];

  assert.deepEqual(removeRepeatedPmsReturnColumns(tables), tables);
});
