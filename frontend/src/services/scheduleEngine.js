// scheduleEngine.js
//
// This file contains scheduling logic only.
// No React or UI code belongs here.

const MINUTES_PER_DAY = 24 * 60

/**
 * Converts "09:30" into minutes from midnight.
 */
function timeStringToMinutes(time) {
  const [hours, minutes] = time.split(':').map(Number)

  return hours * 60 + minutes
}

/**
 * Converts minutes from midnight into "HH:MM".
 */
function minutesToTimeString(totalMinutes) {
  const minutes =
    ((totalMinutes % MINUTES_PER_DAY) +
      MINUTES_PER_DAY) %
    MINUTES_PER_DAY

  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  return `${String(hours).padStart(2, '0')}:${String(
    remainingMinutes
  ).padStart(2, '0')}`
}

/**
 * Adds up durationMinutes across every task.
 */
export function getTotalScheduledMinutes(schedule) {
  return schedule.reduce(
    (sum, task) =>
      sum + (task.durationMinutes || 0),
    0
  )
}

/**
 * Calculates how many minutes remain in the 24-hour day.
 */
export function getAvailableMinutes(schedule) {
  return (
    MINUTES_PER_DAY -
    getTotalScheduledMinutes(schedule)
  )
}

/**
 * Checks whether a schedule fits inside 24 hours.
 */
export function validateSchedule(schedule) {
  const totalMinutes =
    getTotalScheduledMinutes(schedule)

  const overflowMinutes =
    totalMinutes - MINUTES_PER_DAY

  return {
    isValid:
      totalMinutes <= MINUTES_PER_DAY,

    totalMinutes,

    availableMinutes:
      MINUTES_PER_DAY - totalMinutes,

    overflowMinutes:
      overflowMinutes > 0
        ? overflowMinutes
        : 0,
  }
}

/**
 * Splits the schedule into completed,
 * current and upcoming tasks.
 */
export function groupTasksByStatus(schedule) {
  return {
    completed: schedule.filter(
      (task) =>
        task.status === 'completed'
    ),

    current:
      schedule.find(
        (task) =>
          task.status === 'current'
      ) || null,

    upcoming: schedule.filter(
      (task) =>
        task.status === 'upcoming'
    ),
  }
}

/**
 * Preview what would happen if extra time
 * is added to a task.
 */
export function previewAddTime(
  schedule,
  taskId,
  extraMinutes
) {
  const targetIndex =
    schedule.findIndex(
      (task) =>
        task.id === taskId
    )

  if (targetIndex === -1) {
    return {
      ok: false,
      reason: 'Task not found',
    }
  }

  const affected =
    schedule
      .slice(targetIndex + 1)
      .filter(
        (task) => !task.fixed
      )

  return {
    ok: true,

    targetTask:
      schedule[targetIndex].title,

    extraMinutes,

    affectedTasks:
      affected.map((task) => ({
        id: task.id,

        title: task.title,

        before:
          task.durationMinutes,

        after:
          Math.max(
            0,
            task.durationMinutes -
              extraMinutes /
                Math.max(
                  affected.length,
                  1
                )
          ),
      })),
  }
}

/**
 * ------------------------------------------------
 * FEATURE 2 — STEP 3
 * ------------------------------------------------
 *
 * Converts the structured AI request into
 * a draft timetable.
 *
 * IMPORTANT:
 * - Fixed events cannot be moved.
 * - Flexible tasks must fit completely
 *   inside ONE available time window.
 * - Tasks are never split.
 * - Sleep acts as a boundary when provided.
 * - The active Dashboard schedule is NOT changed here.
 */
export function buildDraftSchedule(
  scheduleRequest,
  referenceDate = new Date()
) {
  const {
    fixedEvents = [],
    tasks = [],
    sleep = null,
  } = scheduleRequest

  // Current time in minutes from midnight.
  const nowMinutes =
    referenceDate.getHours() * 60 +
    referenceDate.getMinutes()

  // By default, the scheduling window ends
  // at midnight.
  let dayEndMinutes =
    MINUTES_PER_DAY

  // If the user gave a sleep target,
  // don't place flexible tasks after it.
  if (
    sleep &&
    sleep.startTime
  ) {
    const sleepMinutes =
      timeStringToMinutes(
        sleep.startTime
      )

    if (sleepMinutes > nowMinutes) {
      dayEndMinutes =
        sleepMinutes
    }
  }

  // -----------------------------------------
  // 1. Sort fixed events
  // -----------------------------------------

  const sortedFixed =
    [...fixedEvents]
      .map((event) => ({
        ...event,

        startMin:
          timeStringToMinutes(
            event.startTime
          ),

        endMin:
          timeStringToMinutes(
            event.endTime
          ),
      }))
      .sort(
        (a, b) =>
          a.startMin - b.startMin
      )

  // -----------------------------------------
  // 2. Find available time gaps
  // -----------------------------------------

  const gaps = []

  let cursor = nowMinutes

  for (const event of sortedFixed) {
    // Event already finished.
    if (
      event.endMin <= cursor
    ) {
      continue
    }

    // Event starts after our available window.
    if (
      event.startMin >=
      dayEndMinutes
    ) {
      break
    }

    const segmentStart =
      Math.max(
        event.startMin,
        cursor
      )

    // Time before the fixed event.
    if (
      segmentStart > cursor
    ) {
      gaps.push({
        start: cursor,

        end: Math.min(
          segmentStart,
          dayEndMinutes
        ),
      })
    }

    // Move past the fixed event.
    cursor =
      Math.max(
        cursor,
        Math.min(
          event.endMin,
          dayEndMinutes
        )
      )

    if (
      cursor >=
      dayEndMinutes
    ) {
      break
    }
  }

  // Time after the last fixed event.
  if (
    cursor <
    dayEndMinutes
  ) {
    gaps.push({
      start: cursor,
      end: dayEndMinutes,
    })
  }

  // -----------------------------------------
  // 3. Order flexible tasks
  // -----------------------------------------

  const orderedTasks =
    [...tasks].sort(
      (a, b) => {
        if (
          a.priority ===
          b.priority
        ) {
          return 0
        }

        return a.priority ===
          'high'
          ? -1
          : b.priority === 'high'
            ? 1
            : 0
      }
    )

  const placedTasks = []
  const unplacedTasks = []

  let taskCounter = 1

  // -----------------------------------------
  // 4. Place tasks
  // -----------------------------------------

  for (
    const task of orderedTasks
  ) {
    // A task must fit completely
    // inside ONE gap.
    const gapIndex =
      gaps.findIndex(
        (gap) =>
          gap.end -
            gap.start >=
          task.durationMinutes
      )

    if (
      gapIndex === -1
    ) {
      const largestGap =
        gaps.reduce(
          (max, gap) =>
            Math.max(
              max,
              gap.end -
                gap.start
            ),
          0
        )

      unplacedTasks.push({
        title: task.title,

        neededMinutes:
          task.durationMinutes,

        largestAvailableMinutes:
          largestGap,
      })

      continue
    }

    const gap =
      gaps[gapIndex]

    const startMinutes =
      gap.start

    const endMinutes =
      startMinutes +
      task.durationMinutes

    placedTasks.push({
      id: `draft-task-${String(
        taskCounter
      ).padStart(3, '0')}`,

      title: task.title,

      description:
        task.description || '',

      startTime:
        minutesToTimeString(
          startMinutes
        ),

      endTime:
        minutesToTimeString(
          endMinutes
        ),

      durationMinutes:
        task.durationMinutes,

      type:
        task.type || 'task',

      status: 'upcoming',

      priority:
        task.priority ||
        'medium',

      fixed: false,
    })

    taskCounter++

    // Shrink the remaining gap.
    gap.start =
      endMinutes
  }

  // -----------------------------------------
  // 5. Create break blocks
  // -----------------------------------------

  const breaks =
    gaps
      .filter(
        (gap) =>
          gap.end -
            gap.start >=
          15
      )
      .map(
        (gap, index) => ({
          id: `draft-break-${String(
            index + 1
          ).padStart(3, '0')}`,

          title: 'Break',

          description: '',

          startTime:
            minutesToTimeString(
              gap.start
            ),

          endTime:
            minutesToTimeString(
              gap.end
            ),

          durationMinutes:
            gap.end -
            gap.start,

          type: 'break',

          status: 'upcoming',

          priority: 'low',

          fixed: false,
        })
      )

  // -----------------------------------------
  // 6. Prepare fixed events
  // -----------------------------------------

  const displayFixed =
    fixedEvents.map(
      (event) => ({
        ...event,

        type:
          event.type ||
          'fixed',

        status:
          event.status ||
          'upcoming',
      })
    )

  // -----------------------------------------
  // 7. Combine schedule
  // -----------------------------------------

  const schedule = [
    ...displayFixed,
    ...placedTasks,
    ...breaks,
  ].sort(
    (a, b) =>
      timeStringToMinutes(
        a.startTime
      ) -
      timeStringToMinutes(
        b.startTime
      )
  )

  // -----------------------------------------
  // 8. Validate 24-hour limit
  // -----------------------------------------

  const validation =
    validateSchedule(
      [
        ...fixedEvents,
        ...tasks,
      ]
    )

  // -----------------------------------------
  // 9. Handle unplaced tasks
  // -----------------------------------------

  if (
    unplacedTasks.length >
    0
  ) {
    const boundary =
      sleep &&
      sleep.startTime &&
      dayEndMinutes <
        MINUTES_PER_DAY
        ? 'your sleep target'
        : 'the end of the day'

    const details =
      unplacedTasks
        .map(
          (task) =>
            `${task.title} needs ${
              task.neededMinutes
            } min but the largest open window before ${
              boundary
            } is only ${
              task.largestAvailableMinutes
            } min`
        )
        .join('; ')

    const overflowMinutes =
      unplacedTasks.reduce(
        (sum, task) =>
          sum +
          Math.max(
            0,
            task.neededMinutes -
              task.largestAvailableMinutes
          ),
        0
      )

    return {
      ok: false,

      schedule,

      totalMinutes:
        validation.totalMinutes,

      remainingMinutes:
        Math.max(
          0,
          validation.availableMinutes
        ),

      overflowMinutes,

      reason:
        `Couldn't fit as a single block: ${details}`,
    }
  }

  // -----------------------------------------
  // 10. Successful result
  // -----------------------------------------

  return {
    ok: true,

    schedule,

    totalMinutes:
      validation.totalMinutes,

    remainingMinutes:
      Math.max(
        0,
        validation.availableMinutes
      ),

    overflowMinutes:
      validation.overflowMinutes,
  }
}