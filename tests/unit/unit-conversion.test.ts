import { describe, expect, it } from "vitest";
import {
  convertQuantity,
  convertToUnitSystem,
} from "../../src/domain/unit-conversion.ts";

describe("convertToUnitSystem", () => {
  it.each([
    [1000, "g", "metric", 1, "kg"],
    [1, "kg", "imperial", 2.2046226218487757, "lb"],
    [16, "oz", "metric", 453.59237, "g"],
    [1000, "ml", "metric", 1, "l"],
    [1, "l", "imperial", 4.226752837730375, "cup"],
    [1, "fl oz", "metric", 29.5735295625, "ml"],
  ] as const)(
    "converts %s %s to practical %s units",
    (quantity, unit, system, expectedQuantity, expectedUnit) => {
      expect(convertToUnitSystem(quantity, unit, system)).toEqual({
        quantity: expectedQuantity,
        unit: expectedUnit,
      });
    },
  );

  it("leaves count-based quantities unchanged", () => {
    expect(convertToUnitSystem(3, null, "imperial")).toEqual({
      quantity: 3,
      unit: null,
    });
  });

  it("leaves unknown or unconvertible quantities unchanged", () => {
    expect(convertToUnitSystem(1.5, null, "metric")).toEqual({
      quantity: 1.5,
      unit: null,
    });
  });

  it("does not mutate a source quantity object", () => {
    const source = { quantity: 2, unit: "lb" as const };
    convertToUnitSystem(source.quantity, source.unit, "metric");
    expect(source).toEqual({ quantity: 2, unit: "lb" });
  });
});

describe("convertQuantity", () => {
  it("refuses cross-dimension conversion instead of inferring density", () => {
    expect(convertQuantity(100, "g", "ml")).toEqual({
      quantity: 100,
      unit: "g",
    });
  });
});
