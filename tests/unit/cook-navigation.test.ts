import { describe, expect, it } from "vitest";
import {
  cookKeyboardAction,
  cookSwipeAction,
} from "../../src/ui/cook-navigation.ts";

describe("cook mode navigation input", () => {
  it("maps only horizontal arrow keys to step navigation", () => {
    expect(cookKeyboardAction("ArrowLeft")).toBe("previous");
    expect(cookKeyboardAction("ArrowRight")).toBe("next");
    expect(cookKeyboardAction("Escape")).toBeNull();
    expect(cookKeyboardAction("Enter")).toBeNull();
  });

  it("maps deliberate horizontal swipes and ignores short or vertical gestures", () => {
    expect(cookSwipeAction({ x: 100, y: 20 }, { x: 40, y: 25 })).toBe("next");
    expect(cookSwipeAction({ x: 40, y: 20 }, { x: 100, y: 25 })).toBe(
      "previous",
    );
    expect(cookSwipeAction({ x: 100, y: 20 }, { x: 51, y: 20 })).toBeNull();
    expect(cookSwipeAction({ x: 100, y: 20 }, { x: 40, y: 100 })).toBeNull();
  });
});
