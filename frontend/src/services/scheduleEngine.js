// scheduleEngine.js
//
// This file holds SCHEDULING LOGIC ONLY — no React, no UI code.
// That separation matters: the UI can change completely (new design,
// new framework even) without ever touching how schedules are validated.
//
// This is the FOUNDATION only. Task shifting, free-time search, and
// priority-based rebalancing will be built in a later step.

const MINUTES_PER_DAY = 24 * 60

/**
 * Adds up durationMinutes across every task in the schedule.
 */
export function getTotalScheduledMinutes(schedule) {
  return schedule.reduce((sum, task) => sum + task.durationMinutes, 0)
}

/**
 * How many minutes are still free in the 24-hour day.
 * Can be negative if the schedule is already overbooked.
 */
export function getAvailableMinutes(schedule) {
  return MINUTES_PER_DAY - getTotalScheduledMinutes(schedule)
}

/**
 * Checks whether a schedule fits inside 24 hours.
 * Returns a result object instead of just true/false, so the caller
 * (UI or AI layer) can explain *why* it failed and by how much.
 */
export function validateSchedule(schedule) {
  const totalMinutes = getTotalScheduledMinutes(schedule)
  const overflowMinutes = totalMinutes - MINUTES_PER_DAY

  return {
    isValid: totalMinutes <= MINUTES_PER_DAY,
    totalMinutes,
    availableMinutes: MINUTES_PER_DAY - totalMinutes,
    overflowMinutes: overflowMinutes > 0 ? overflowMinutes : 0,
  }
}

/**
 * Splits a schedule into the three groups the UI cares about.
 */
export function groupTasksByStatus(schedule) {
  return {
    completed: schedule.filter((t) => t.status === 'completed'),
    current: schedule.find((t) => t.status === 'current') || null,
    upcoming: schedule.filter((t) => t.status === 'upcoming'),
  }
}

/**
 * Foundation for the future "+15 MIN" feature: given a taskId and
 * extra minutes, calculates what WOULD happen, without changing
 * anything yet. The UI uses this to show a confirmation preview.
 * Fixed tasks (like College) are left alone; only flexible tasks
 * after the extended one absorb the shift.
 */
export function previewAddTime(schedule, taskId, extraMinutes) {
  const targetIndex = schedule.findIndex((t) => t.id === taskId)
  if (targetIndex === -1) {
    return { ok: false, reason: 'Task not found' }
  }

  const affected = schedule
    .slice(targetIndex + 1)
    .filter((t) => !t.fixed)

  return {
    ok: true,
    targetTask: schedule[targetIndex].title,
    extraMinutes,
    affectedTasks: affected.map((t) => ({
      id: t.id,
      title: t.title,
      before: t.durationMinutes,
      after: Math.max(0, t.durationMinutes - extraMinutes / affected.length),
    })),
  }
}
