import { validateSchedule } from './scheduleEngine.js'

/**
 * Interprets a natural-language modification request.
 * This is still mocked — no real AI is used yet.
 */
export async function interpretMessage(message) {
  await mockDelay()

  const lower = message.toLowerCase()

  if (lower.includes('more time') || lower.includes('more minutes')) {
    return { intent: 'ADD_TIME', taskId: null, minutes: 15 }
  }

  if (lower.includes('skip')) {
    return { intent: 'SKIP_TASK', taskId: null }
  }

  if (lower.includes('what') && lower.includes('next')) {
    return { intent: 'SHOW_NEXT_TASK' }
  }

  return { intent: 'UNKNOWN', rawMessage: message }
}

/**
 * Generates a schedule.
 * Still mocked for now.
 *
 * Actual timetable generation will be implemented later.
 */
export async function generateSchedule(message) {
  await mockDelay()

  return {
    ok: true,
    note: 'Mock response — real schedule generation comes later.',
    receivedMessage: message,
  }
}

/**
 * Converts a natural-language schedule request
 * into structured schedule data.
 */
export async function parseScheduleRequest(message) {
  await mockDelay()

  const fixedEvents = []
  const tasks = []

  // -----------------------------------------
  // Detect fixed time ranges
  // Example:
  // "college from 9 AM to 4 PM"
  // -----------------------------------------

  const timeRangeRegex =
    /([a-zA-Z][a-zA-Z\s]*?)\s*(?:from|at)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/g

  let match
  let fixedIndex = 1

  while ((match = timeRangeRegex.exec(message)) !== null) {
    const title = cleanTitle(match[1])

    const startTime = convertTo24Hour(match[2])
    const endTime = convertTo24Hour(match[3])

    if (title && startTime && endTime) {
      const durationMinutes = calculateDuration(startTime, endTime)

      fixedEvents.push({
        id: `fixed-${String(fixedIndex).padStart(3, '0')}`,
        title: capitalize(title),
        startTime,
        endTime,
        durationMinutes,
        fixed: true,
      })

      fixedIndex += 1
    }
  }

  // -----------------------------------------
  // Detect duration tasks
  //
  // Examples:
  // "2 hours of DSA"
  // "3 hours of project work"
  // "1 hour assignment"
  // "45 minutes exercise"
  // -----------------------------------------

  const durationRegex =
    /(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)\s*(?:of|for)?\s*([a-zA-Z][a-zA-Z\s]*?)(?=,|\.|and\s+\d|\s+and\s+[a-zA-Z]+|$)/gi

  let taskIndex = 1

  while ((match = durationRegex.exec(message)) !== null) {
    const amount = Number(match[1])
    const unit = match[2].toLowerCase()
    let title = cleanTitle(match[3])

    if (!title) continue

    // Avoid treating fixed-event text as a task.
    if (
      title.toLowerCase().includes('college') ||
      title.toLowerCase().includes('work from')
    ) {
      continue
    }

    let durationMinutes

    if (unit.startsWith('hour') || unit.startsWith('hr')) {
      durationMinutes = Math.round(amount * 60)
    } else {
      durationMinutes = Math.round(amount)
    }

    if (durationMinutes <= 0) continue

    const priority = detectPriority(message, match.index)

    tasks.push({
      id: `task-${String(taskIndex).padStart(3, '0')}`,
      title: capitalize(title),
      description: '',
      durationMinutes,
      priority,
      fixed: false,
    })

    taskIndex += 1
  }

  // -----------------------------------------
  // Detect sleep time
  //
  // Example:
  // "sleep at 11:30 PM"
  // -----------------------------------------

  const sleepMatch = message.match(
    /sleep\s+(?:at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/i
  )

  let sleep = null

  if (sleepMatch) {
    sleep = {
      startTime: convertTo24Hour(sleepMatch[1]),
      durationMinutes: null,
    }
  }

  // -----------------------------------------
  // Calculate 24-hour information
  // -----------------------------------------

  const scheduleItems = [
    ...fixedEvents,
    ...tasks,
  ]

  const validation = validateSchedule(scheduleItems)

  const totalRequestedMinutes = validation.totalMinutes
  const overflowMinutes = Math.max(0, totalRequestedMinutes - 1440)
  const remainingMinutes = Math.max(
    0,
    1440 - totalRequestedMinutes
  )

  return {
    ok: true,
    fixedEvents,
    tasks,
    sleep,
    totalRequestedMinutes,
    remainingMinutes,
    overflowMinutes,
    rawMessage: message,
  }
}

/**
 * Generates a readable confirmation message
 * from structured schedule data.
 */
export function buildScheduleConfirmation(data) {
  const lines = ['I understand your requirements:', '']

  data.fixedEvents.forEach((event) => {
    lines.push(
      `• ${event.title}: ${formatTime(event.startTime)}–${formatTime(
        event.endTime
      )}`
    )
  })

  data.tasks.forEach((task) => {
    lines.push(
      `• ${task.title}: ${formatDuration(task.durationMinutes)}`
    )
  })

  if (data.sleep) {
    lines.push(
      `• Sleep target: ${formatTime(data.sleep.startTime)}`
    )
  }

  lines.push('')

  if (data.overflowMinutes > 0) {
    lines.push(
      `⚠ Your request exceeds the 24-hour limit by ${formatDuration(
        data.overflowMinutes
      )}.`
    )
    lines.push('')
    lines.push('We need to adjust or move some tasks before building the timetable.')
  } else {
    lines.push(
      `You have ${formatDuration(
        data.remainingMinutes
      )} of remaining time.`
    )
    lines.push('')
    lines.push('Would you like me to build the timetable?')
  }

  return lines.join('\n')
}

/**
 * Produces the existing mock conversational response.
 */
export async function generateResponse(message) {
  await mockDelay()

  const lower = message.toLowerCase()

  if (/^\s*(hi|hello|hey)\b/.test(lower)) {
    return "Hi! Tell me about your day and I'll help you build a realistic 24-hour schedule."
  }

  return `Got it — I'll treat that as: "${message}". (This is a mock reply for now.)`
}

// -----------------------------------------
// Helper functions
// -----------------------------------------

function cleanTitle(value) {
  return value
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^(and|need|i have)\s+/i, '')
    .replace(/\s+$/g, '')
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function detectPriority(message, index) {
  const nearbyText = message
    .slice(Math.max(0, index - 40), index + 40)
    .toLowerCase()

  if (
    nearbyText.includes('important') ||
    nearbyText.includes('high priority')
  ) {
    return 'high'
  }

  return 'medium'
}

function convertTo24Hour(timeString) {
  const value = timeString.trim().toUpperCase()

  const match = value.match(
    /^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/
  )

  if (!match) return null

  let hour = Number(match[1])
  const minutes = Number(match[2] || 0)
  const period = match[3]

  if (minutes > 59 || hour > 23) return null

  if (period === 'AM') {
    if (hour === 12) hour = 0
  } else if (period === 'PM') {
    if (hour !== 12) hour += 12
  }

  return `${String(hour).padStart(2, '0')}:${String(
    minutes
  ).padStart(2, '0')}`
}

function calculateDuration(startTime, endTime) {
  const [startHour, startMinute] = startTime.split(':').map(Number)
  const [endHour, endMinute] = endTime.split(':').map(Number)

  const start = startHour * 60 + startMinute
  let end = endHour * 60 + endMinute

  if (end < start) {
    end += 24 * 60
  }

  return end - start
}

function formatDuration(minutes) {
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours}h ${remainingMinutes}m`
  }

  if (hours > 0) {
    return `${hours}h`
  }

  return `${remainingMinutes}m`
}

function formatTime(time) {
  if (!time) return ''

  const [hourString, minute] = time.split(':')
  let hour = Number(hourString)

  const period = hour >= 12 ? 'PM' : 'AM'

  if (hour === 0) hour = 12
  if (hour > 12) hour -= 12

  return `${hour}:${minute} ${period}`
}

function mockDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}