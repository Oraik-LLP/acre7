import type { PlanPoint } from "./types";

export function normalizeDegrees(value: number) {
  return ((value + 180) % 360 + 360) % 360 - 180;
}

export function planBearingDegrees(source: PlanPoint, target: PlanPoint) {
  const deltaX = target.x - source.x;
  const deltaY = target.y - source.y;

  // Floor-plan Y coordinates increase down the screen. Panorama bearings use
  // north/up as 0 degrees and increase clockwise.
  return normalizeDegrees(Math.atan2(deltaX, -deltaY) * (180 / Math.PI));
}

export function planDistance(source: PlanPoint, target: PlanPoint) {
  return Math.hypot(target.x - source.x, target.y - source.y);
}
