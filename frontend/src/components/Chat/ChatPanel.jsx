import { useState } from 'react'
import { generateResponse } from '../../services/aiService.js'
import './ChatPanel.css'

/**
 * The "Ask AI" chat bar. This is a foundation only: it sends the
 * message to aiService (currently mocked) and shows the reply.
 * Real natural-language schedule editing comes in a later step.
 */
function ChatPanel() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [isThinking, setIsThinking] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    const text = input.trim()
    if (!text) return

    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    setIsThinking(true)

    const reply = await generateResponse(text)

    setMessages((prev) => [...prev, { role: 'ai', text: reply }])
    setIsThinking(false)
  }

  return (
    <div className="chat-panel">
      <div className="chat-panel__log" aria-live="polite">
        {messages.length === 0 && !isThinking && (
          <p className="chat-panel__empty">
            Try: "I finished DSA early" or "Skip exercise today."
          </p>
        )}
        {messages.map((m, i) => (
          <p key={i} className={`chat-panel__msg chat-panel__msg--${m.role}`}>
            {m.text}
          </p>
        ))}
        {isThinking && <p className="chat-panel__msg chat-panel__msg--ai">Thinking…</p>}
      </div>

      <form className="chat-panel__form" onSubmit={handleSubmit}>
        <span className="chat-panel__icon" aria-hidden="true">✦</span>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask AI to adjust your schedule…"
          aria-label="Message to AI"
        />
        <button type="submit" aria-label="Send message">
          Send
        </button>
      </form>
    </div>
  )
}

export default ChatPanel
