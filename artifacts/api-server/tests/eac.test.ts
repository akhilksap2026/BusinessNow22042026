import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateEAC } from "../src/lib/eac.ts";

describe("calculateEAC", () => {
  it("returns estimate when no progress (0% complete)", () => {
    const result = calculateEAC(0, 10, 0);
    assert.equal(result.eacHours, 10);
    assert.equal(result.varianceHours, 0);
    assert.equal(result.status, "on-track");
  });

  it("returns estimate when actual is 0 regardless of pct", () => {
    const result = calculateEAC(0, 10, 0.5);
    assert.equal(result.eacHours, 10);
    assert.equal(result.varianceHours, 0);
    assert.equal(result.status, "on-track");
  });

  it("calculates overrun correctly", () => {
    // 8 hours spent, 50% complete, estimate 10
    // ETC = 8 * (0.5 / 0.5) = 8
    // EAC = 8 + 8 = 16 → variance = +6 → over
    const result = calculateEAC(8, 10, 0.5);
    assert.equal(result.eacHours, 16);
    assert.equal(result.varianceHours, 6);
    assert.equal(result.status, "over");
  });

  it("calculates on-track correctly", () => {
    // 5 hours spent, 50% complete, estimate 10
    // ETC = 5 * (0.5 / 0.5) = 5
    // EAC = 5 + 5 = 10 → variance = 0 → on-track
    const result = calculateEAC(5, 10, 0.5);
    assert.equal(result.eacHours, 10);
    assert.equal(result.varianceHours, 0);
    assert.equal(result.status, "on-track");
  });

  it("handles 100% completion", () => {
    // At 100%, EAC = actuals
    const result = calculateEAC(12, 10, 1.0);
    assert.equal(result.eacHours, 12);
    assert.equal(result.varianceHours, 2);
    assert.equal(result.status, "over");
  });

  it("detects underrun status", () => {
    // 3 hours spent, 50% complete, estimate 10
    // ETC = 3 * (0.5/0.5) = 3 → EAC = 6 → variance = -4 → -40% → under
    const result = calculateEAC(3, 10, 0.5);
    assert.equal(result.eacHours, 6);
    assert.equal(result.varianceHours, -4);
    assert.equal(result.status, "under");
  });

  it("rounds to 2 decimal places", () => {
    const result = calculateEAC(7, 10, 0.3);
    assert.equal(result.eacHours, Math.round((7 + 7 * (0.7 / 0.3)) * 100) / 100);
  });
});
