export type CookNavigationAction = "previous" | "next";

export function cookKeyboardAction(key: string): CookNavigationAction | null {
  if (key === "ArrowLeft") return "previous";
  if (key === "ArrowRight") return "next";
  return null;
}

export function cookSwipeAction(
  start: { x: number; y: number },
  end: { x: number; y: number },
  threshold = 50,
): CookNavigationAction | null {
  const horizontal = end.x - start.x;
  const vertical = end.y - start.y;
  if (
    Math.abs(horizontal) < threshold ||
    Math.abs(horizontal) <= Math.abs(vertical)
  ) {
    return null;
  }
  return horizontal < 0 ? "next" : "previous";
}
