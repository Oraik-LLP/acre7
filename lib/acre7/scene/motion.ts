import { Euler, MathUtils, Quaternion, Vector3 } from "three";

// Device coordinates look through the top of the phone; the tour looks through
// its back. Correct that basis and the screen rotation before reading heading.
const deviceEuler = new Euler(0, 0, 0, "YXZ");
const deviceQuaternion = new Quaternion();
const screenQuaternion = new Quaternion();
const cameraCorrection = new Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2);
const screenAxis = new Vector3(0, 0, 1);
const forward = new Vector3();

export function deviceLookAngles(alpha: number, beta: number, gamma: number, screenAngle: number) {
  deviceEuler.set(MathUtils.degToRad(beta), MathUtils.degToRad(alpha), -MathUtils.degToRad(gamma), "YXZ");
  deviceQuaternion.setFromEuler(deviceEuler).multiply(cameraCorrection);
  deviceQuaternion.multiply(screenQuaternion.setFromAxisAngle(screenAxis, -MathUtils.degToRad(screenAngle)));
  forward.set(0, 0, -1).applyQuaternion(deviceQuaternion);
  return {
    yaw: MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)),
    pitch: MathUtils.radToDeg(Math.asin(MathUtils.clamp(forward.y, -1, 1))),
  };
}

export function frameSmoothing(deltaSeconds: number, response: number) {
  return 1 - Math.exp(-response * deltaSeconds);
}

export function adjacentViewpointIndex(current: number, direction: -1 | 1, count: number) {
  const next = current + direction;
  return current >= 0 && next >= 0 && next < count ? next : null;
}
