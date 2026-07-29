import { describe, it, expect } from "vitest";
import {
  getSaatyValue,
  sliderToRatio,
  mapRatioToSlider,
  parseCleanNumeric,
  calculateAHP,
  calculateTOPSIS,
} from "./math";
import { Criterion } from "../types";

describe("getSaatyValue", () => {
  it("maps slider values to Saaty scale correctly per proposed test cases", () => {
    expect(getSaatyValue(0)).toBe(1);
    expect(getSaatyValue(-3)).toBe(4);
    expect(getSaatyValue(5)).toBe(6);
    expect(getSaatyValue(-8)).toBe(9);
    expect(getSaatyValue(8)).toBe(9);
    expect(getSaatyValue(-1)).toBe(2);
  });
});

describe("sliderToRatio", () => {
  it("maps slider value to ratio r = w_i / w_j correctly", () => {
    expect(sliderToRatio(0)).toBe(1);
    expect(sliderToRatio(-2)).toBe(3);
    expect(sliderToRatio(3)).toBeCloseTo(0.25, 6);
    expect(sliderToRatio(-8)).toBe(9);
    expect(sliderToRatio(8)).toBeCloseTo(1 / 9, 6);
  });
});

describe("mapRatioToSlider", () => {
  it("maps ratio back to slider value correctly (inverse of sliderToRatio)", () => {
    expect(mapRatioToSlider(1.0)).toBe(0);
    expect(mapRatioToSlider(1.02)).toBe(0);
    expect(mapRatioToSlider(3)).toBe(-2);
    expect(mapRatioToSlider(0.25)).toBe(3);
    expect(mapRatioToSlider(9)).toBe(-8);
    expect(mapRatioToSlider(1 / 9)).toBe(8);
  });
});

describe("parseCleanNumeric", () => {
  it("parses numeric and string values robustly per proposed test cases", () => {
    expect(parseCleanNumeric(42)).toBe(42);
    expect(parseCleanNumeric("42")).toBe(42);
    expect(parseCleanNumeric("3.14")).toBe(3.14);
    expect(parseCleanNumeric("$799")).toBe(799);
    expect(parseCleanNumeric("12 hrs")).toBe(12);
    expect(parseCleanNumeric("45%")).toBe(45);
    expect(parseCleanNumeric("2.5k")).toBe(2500);
    expect(parseCleanNumeric("1.2M")).toBe(1200000);
    expect(parseCleanNumeric("3B")).toBe(3000000000);
    expect(parseCleanNumeric("10-12")).toBe(11);
    expect(parseCleanNumeric("10 to 12")).toBe(11);
    expect(parseCleanNumeric("10–12")).toBe(11);
    expect(Number.isNaN(parseCleanNumeric(""))).toBe(true);
    expect(Number.isNaN(parseCleanNumeric("abc"))).toBe(true);
    expect(Number.isNaN(parseCleanNumeric(null as any))).toBe(true);
  });
});

describe("calculateAHP", () => {
  it("handles edge case: n=1, no comparisons", () => {
    const result = calculateAHP(1, []);
    expect(result.weights).toEqual([1]);
    expect(result.ci).toBe(0);
    expect(result.cr).toBe(0);
    expect(result.isConsistent).toBe(true);
  });

  it("handles edge case: n=2, equal comparison (value=0)", () => {
    const result = calculateAHP(2, [
      { criterionAIndex: 0, criterionBIndex: 1, value: 0 },
    ]);
    expect(result.weights).toEqual([0.5, 0.5]);
    expect(result.isConsistent).toBe(true);
  });

  it("calculates Saaty 3x3 integration test with expected column normalization values", () => {
    const comparisons = [
      { criterionAIndex: 0, criterionBIndex: 1, value: -2 }, // C1 vs C2: 3x
      { criterionAIndex: 0, criterionBIndex: 2, value: -6 }, // C1 vs C3: 7x
      { criterionAIndex: 1, criterionBIndex: 2, value: -2 }, // C2 vs C3: 3x
    ];
    const result = calculateAHP(3, comparisons);

    expect(result.weights[0]).toBeCloseTo(0.669, 3);
    expect(result.weights[1]).toBeCloseTo(0.243, 3);
    expect(result.weights[2]).toBeCloseTo(0.088, 3);

    const sum = result.weights.reduce((a, b) => a + b, 0);
    expect(sum).toBeCloseTo(1.000, 4);

    expect(result.lambdaMax).toBeCloseTo(3.007, 2);
    expect(result.cr).toBeLessThan(0.10);
    expect(result.isConsistent).toBe(true);
  });

  it("identifies inconsistent matrix correctly", () => {
    const comparisons = [
      { criterionAIndex: 0, criterionBIndex: 1, value: -7 }, // C1 >>> C2
      { criterionAIndex: 1, criterionBIndex: 2, value: -7 }, // C2 >>> C3
      { criterionAIndex: 0, criterionBIndex: 2, value: 3 },  // C3 > C1
    ];
    const result = calculateAHP(3, comparisons);

    expect(result.isConsistent).toBe(false);
    expect(result.cr).toBeGreaterThan(0.10);
  });
});

describe("calculateTOPSIS", () => {
  it("calculates 2x2 hand-computed integration test correctly", () => {
    const alternatives = ["Option A", "Option B"];
    const criteria: Criterion[] = [
      { name: "Price", type: "cost", unit: "$" },
      { name: "Quality", type: "benefit", unit: "pts" },
    ];
    const weights = [0.5, 0.5];
    const rawData = [["500", "8"], ["300", "6"]];
    const result = calculateTOPSIS(alternatives, criteria, weights, rawData);

    expect(result[0].alternative).toBe("Option B");
    expect(result[0].rank).toBe(1);
    expect(result[0].score).toBeCloseTo(0.632, 2);
    expect(result[1].alternative).toBe("Option A");
    expect(result[1].rank).toBe(2);
  });

  it("ranks higher raw values first for all-benefit criteria", () => {
    const alternatives = ["Low", "High"];
    const criteria: Criterion[] = [{ name: "Benefit", type: "benefit", unit: "pts" }];
    const weights = [1.0];
    const rawData = [["10"], ["90"]];
    const result = calculateTOPSIS(alternatives, criteria, weights, rawData);

    expect(result[0].alternative).toBe("High");
    expect(result[0].rank).toBe(1);
  });

  it("ranks lower raw values first for all-cost criteria", () => {
    const alternatives = ["Expensive", "Cheap"];
    const criteria: Criterion[] = [{ name: "Cost", type: "cost", unit: "$" }];
    const weights = [1.0];
    const rawData = [["100"], ["10"]];
    const result = calculateTOPSIS(alternatives, criteria, weights, rawData);

    expect(result[0].alternative).toBe("Cheap");
    expect(result[0].rank).toBe(1);
  });

  it("handles single alternative edge case with score = 0.5", () => {
    const alternatives = ["Only Option"];
    const criteria: Criterion[] = [{ name: "Quality", type: "benefit", unit: "pts" }];
    const weights = [1.0];
    const rawData = [["10"]];
    const result = calculateTOPSIS(alternatives, criteria, weights, rawData);

    expect(result[0].alternative).toBe("Only Option");
    expect(result[0].score).toBeCloseTo(0.5, 5);
    expect(result[0].rank).toBe(1);
  });

  it("error case: throws when weights.length != criteria.length", () => {
    const alternatives = ["Option A", "Option B"];
    const criteria: Criterion[] = [
      { name: "Price", type: "cost", unit: "$" },
      { name: "Quality", type: "benefit", unit: "pts" },
    ];
    const weights = [1.0]; // mismatched length
    const rawData = [["500", "8"], ["300", "6"]];

    expect(() =>
      calculateTOPSIS(alternatives, criteria, weights, rawData)
    ).toThrow(/Mismatch between weights count/i);
  });

  it("error case: throws when a cell contains unparseable text like 'abc'", () => {
    const alternatives = ["Option A", "Option B"];
    const criteria: Criterion[] = [
      { name: "Price", type: "cost", unit: "$" },
      { name: "Quality", type: "benefit", unit: "pts" },
    ];
    const weights = [0.5, 0.5];
    const rawData = [["abc", "8"], ["300", "6"]];

    expect(() =>
      calculateTOPSIS(alternatives, criteria, weights, rawData)
    ).toThrow(/Unable to parse/i);
  });

  it("error case: parses cell containing '$1,200' as 1200 without error", () => {
    const alternatives = ["Option A", "Option B"];
    const criteria: Criterion[] = [
      { name: "Price", type: "cost", unit: "$" },
      { name: "Quality", type: "benefit", unit: "pts" },
    ];
    const weights = [0.5, 0.5];
    const rawData = [["$1,200", "8"], ["300", "6"]];

    expect(() =>
      calculateTOPSIS(alternatives, criteria, weights, rawData)
    ).not.toThrow();

    const result = calculateTOPSIS(alternatives, criteria, weights, rawData);
    expect(result.length).toBe(2);
  });
});
