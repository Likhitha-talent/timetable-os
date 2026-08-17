import { useState } from 'react'
import {
  generateResponse,
  parseScheduleRequest,
  buildScheduleConfirmation,
} from '../../services/aiService.js'
import './ChatPanel.css'

function ChatPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    const text = input.trim()

    if (!text) return

    const userMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: text,
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsThinking(true)

    try {
      const parsedSchedule = await parseScheduleRequest(text)

      let replyText

      if (
        parsedSchedule.fixedEvents.length > 0 ||
        parsedSchedule.tasks.length > 0 ||
        parsedSchedule.sleep
      ) {
        replyText = buildScheduleConfirmation(parsedSchedule)
      } else {
        replyText = await generateResponse(text)
      }

      const assistantMessage = {
        id: `msg-${Date.now()}-a`,
        role: 'assistant',
        content: replyText,
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error('AI parsing error:', error)

      const errorMessage = {
        id: `msg-${Date.now()}-error`,
        role: 'assistant',
        content:
          "Sorry, I couldn't understand that schedule request. Please try describing your tasks, durations, or fixed commitments.",
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsThinking(false)
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__log" aria-live="polite">
        {messages.length === 0 && !isThinking && (
          <p className="chat-panel__empty">
            Try: "I have college from 9 AM to 4 PM, need 2 hours
            of DSA."
          </p>
        )}

        {messages.map((message) => (
          <p
            key={message.id}
            className={`chat-panel__msg chat-panel__msg--${
              message.role === 'assistant' ? 'ai' : 'user'
            }`}
            style={{ whiteSpace: 'pre-line' }}
          >
            {message.content}
          </p>
        ))}

        {isThinking && (
          <p className="chat-panel__msg chat-panel__msg--ai">
            Thinking…
          </p>
        )}
      </div>

      <form
        className="chat-panel__form"
        onSubmit={handleSubmit}
      >
        <span
          className="chat-panel__icon"
          aria-hidden="true"
        >
          ✦
        </span>

        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to adjust your schedule…"
          aria-label="Message to AI"
        />

        <button
          type="submit"
          aria-label="Send message"
        >
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatPanel