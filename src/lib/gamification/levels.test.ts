import { describe, it, expect } from "vitest";
import { calculateLevel, getLevelTitle } from "./levels";

describe("calculateLevel", () => {
  it("returns level 1 for 0 points", () => {
    const info = calculateLevel(0);
    expect(info.level).toBe(1);
    expect(info.totalPoints).toBe(0);
    expect(info.pointsForCurrentLevel).toBe(0);
  });

  it("returns level 1 for 99 points (just below threshold)", () => {
    const info = calculateLevel(99);
    expect(info.level).toBe(1);
    expect(info.progressInLevel).toBeCloseTo(0.99, 1);
  });

  it("returns level 2 for exactly 100 points", () => {
    const info = calculateLevel(100);
    expect(info.level).toBe(2);
    expect(info.pointsForCurrentLevel).toBe(100);
  });

  it("returns level 3 for 300 points", () => {
    const info = calculateLevel(300);
    expect(info.level).toBe(3);
    expect(info.pointsForCurrentLevel).toBe(300);
  });

  it("returns level 4 for 600 points", () => {
    const info = calculateLevel(600);
    expect(info.level).toBe(4);
  });

  it("calculates progress within a level", () => {
    // Level 2 is 100-299, so 200 is halfway
    const info = calculateLevel(200);
    expect(info.level).toBe(2);
    expect(info.progressInLevel).toBeCloseTo(0.5, 1);
  });

  it("handles very large point values", () => {
    const info = calculateLevel(100000);
    expect(info.level).toBeGreaterThan(10);
  });

  it("levels increase monotonically", () => {
    let prevLevel = 0;
    for (let points = 0; points <= 5000; points += 50) {
      const info = calculateLevel(points);
      expect(info.level).toBeGreaterThanOrEqual(prevLevel);
      prevLevel = info.level;
    }
  });
});

describe("getLevelTitle", () => {
  it("returns Beginner for level 1", () => {
    expect(getLevelTitle(1).en).toBe("Beginner");
    expect(getLevelTitle(1).de).toBe("Anfänger");
  });

  it("returns Explorer for level 5", () => {
    expect(getLevelTitle(5).en).toBe("Explorer");
  });

  it("returns Learner for level 10", () => {
    expect(getLevelTitle(10).en).toBe("Learner");
  });

  it("returns Advanced for level 20", () => {
    expect(getLevelTitle(20).en).toBe("Advanced");
  });

  it("returns Expert for level 30", () => {
    expect(getLevelTitle(30).en).toBe("Expert");
  });

  it("returns Master for level 40", () => {
    expect(getLevelTitle(40).en).toBe("Master");
  });
});
