// Small, pure helper functions for formatting time.
// "Pure" means: same input always gives same output, no side effects.
// That makes them easy to test and reuse anywhere.

/**
 * Turns a count of seconds into "HH:MM:SS".
 * e.g. secondsToClock(5016) -> "01:23:36"
 */
export function secondsToClock(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds))
  const hours = Math.floor(safeSeconds / 3600)
  const minutes = Math.floor((safeSeconds % 3600) / 60)
  const seconds = safeSeconds % 60

  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Turns minutes into a short label like "3h" or "45m" or "1h 30m".
 */
export function minutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) return `${minutes}m`
  if (minutes === 0) return `${hours}h`
  return `${hours}h ${minutes}m`
}

/**
 * Returns how many seconds are left today (from local browser time
 * until midnight). Used by the Day Timer — never hardcoded.
 */
export function secondsRemainingToday() {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0) // next midnight
  return Math.floor((midnight.getTime() - now.getTime()) / 1000)
}

/**
 * Formats the current wall-clock time as "HH:MM:SS", using the
 * browser's local time (never hardcoded).
 */
export function nowAsClock() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
}
