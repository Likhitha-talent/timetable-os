// timerService.js
//
// Countdown math, kept separate from React so it's easy to test and reuse.
//
// IMPORTANT: we never just "subtract 1 every second". If the browser tab
// is backgrounded, timers get throttled and a simple counter drifts.
// Instead we always calculate: remaining = endTimestamp - now.
// That's always correct no matter how long the tab was inactive.

/**
 * Given a duration in minutes (starting now), returns the timestamp
 * (milliseconds since epoch) at which it ends.
 */
export function getEndTimestamp(durationMinutes, startTimestamp = Date.now()) {
  return startTimestamp + durationMinutes * 60 * 1000
}

/**
 * Returns whole seconds remaining until endTimestamp. Never negative.
 */
export function getSecondsRemaining(endTimestamp, now = Date.now()) {
  return Math.max(0, Math.floor((endTimestamp - now) / 1000))
}

/**
 * Pushes an endTimestamp forward by N minutes — used by "+15 MIN".
 */
export function extendTimestamp(endTimestamp, extraMinutes) {
  return endTimestamp + extraMinutes * 60 * 1000
}
