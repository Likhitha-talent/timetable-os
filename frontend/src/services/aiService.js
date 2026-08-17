// aiService.js
//
// This is the ONLY file that will ever talk to an AI provider.
// It is intentionally a thin wrapper: right now every function returns
// mock/fake data so we can build the UI without needing a real AI key.
//
// SECURITY NOTE: this file must NEVER contain an API key. When we
// connect a real AI, this function will call OUR Django backend
// (which holds the key securely), not the AI provider directly.
//
// Later, aiEngine (in ai-engine/) will do the heavy lifting of turning
// natural language into structured intents. This file just calls it.

/**
 * Takes a raw chat message and returns a structured "intent" object,
 * the same shape the real AI engine will eventually produce.
 * e.g. "Give me 20 more minutes" -> { intent: "ADD_TIME", minutes: 20 }
 */
export async function interpretMessage(message) {
  // Mock delay, so the UI can show a "thinking" state realistically.
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
 * Given a full-day request in plain English, would eventually return
 * a generated schedule. For now, returns a mock acknowledgement —
 * actual generation happens once scheduleEngine grows more logic.
 */
export async function generateSchedule(message) {
  await mockDelay()
  return {
    ok: true,
    note: 'Mock response — real schedule generation comes in a later step.',
    receivedMessage: message,
  }
}

/**
 * Produces a short assistant-style reply for the chat panel.
 */
// export async function generateResponse(context) {
//   await mockDelay()
//   return `Got it — I'll treat that as: "${context}". (This is a mock reply for now.)`
// }
/**
 * Produces a short assistant-style reply for the chat panel.
 * This is still fully mocked — no real LLM call happens here.
 * If the message looks like a schedule description (has time ranges
 * and/or "X hours of Y" phrases), it reflects that back in a
 * structured way, similar to how a real AI assistant would confirm
 * understanding before building a schedule.
 */
export async function generateResponse(message) {
  await mockDelay()

  const lower = message.toLowerCase()

  // Simple greeting -> friendly onboarding reply
  if (/^\s*(hi|hello|hey)\b/.test(lower)) {
    return "Hi! Tell me about your day and I'll help you build a realistic 24-hour schedule."
  }

  // Try to detect a time range like "9 AM to 4 PM" or "9-4"
  const timeRangeMatch = message.match(
    /(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)\s*(?:to|-|–)\s*(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm)?)/
  )

  // Try to detect phrases like "2 hours of DSA" or "3 hours of project work"
  const durationMatches = [
    ...message.matchAll(/(\d+(?:\.\d+)?)\s*hours?\s*(?:of|for)?\s*([a-zA-Z][a-zA-Z\s]*)/g),
  ]

  if (timeRangeMatch || durationMatches.length > 0) {
    let reply = 'I understand. You have:\n'

    if (timeRangeMatch) {
      reply += `• College: ${timeRangeMatch[1].trim()}–${timeRangeMatch[2].trim()}\n`
    }

    durationMatches.forEach(([, hours, label]) => {
      const cleanLabel = label.trim().replace(/\s+/g, ' ')
      if (cleanLabel) {
        reply += `• ${capitalize(cleanLabel)}: ${hours} hour${hours === '1' ? '' : 's'}\n`
      }
    })

    reply += '\nWould you like me to build a schedule?'
    return reply
  }

  // Fallback for anything else we don't recognize yet
  return `Got it — I'll treat that as: "${message}". (This is a mock reply for now.)`
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
function mockDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
