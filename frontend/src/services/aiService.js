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
export async function generateResponse(context) {
  await mockDelay()
  return `Got it — I'll treat that as: "${context}". (This is a mock reply for now.)`
}

function mockDelay(ms = 400) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
