import type { ClockPort } from "../../ports/clock-port.js";

export class MemoryClockAdapter implements ClockPort {
  now(): Date {
    return new Date();
  }
}
