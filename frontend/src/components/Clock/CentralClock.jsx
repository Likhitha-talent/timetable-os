import { useState, useEffect } from 'react'
import { secondsToClock, nowAsClock, secondsRemainingToday } from '../../utils/timeUtils.js'
import { useTaskTimer } from '../../hooks/useTaskTimer.js'
import './CentralClock.css'

/**
 * The signature visual element of the app: a circular "instrument
 * panel" clock with a 24-tick dial ring, like a chronograph bezel.
 *
 * It has two faces:
 *  - "task": counts down the current task (from currentTask.durationMinutes)
 *  - "day":  counts down the rest of the day, using real local time
 *
 * The user can flip between them by clicking the card.
 */
function CentralClock({ currentTask }) {
  const [face, setFace] = useState('task') // 'task' | 'day'
  const { secondsRemaining: taskSecondsRemaining } = useTaskTimer(
    currentTask ? currentTask.durationMinutes : 0
  )
  const [daySeconds, setDaySeconds] = useState(secondsRemainingToday())

  useEffect(() => {
    const intervalId = setInterval(() => {
      setDaySeconds(secondsRemainingToday())
    }, 1000)
    return () => clearInterval(intervalId)
  }, [])

  const isTaskFace = face === 'task' && currentTask

  return (
    <button
      className="central-clock"
      onClick={() => setFace(face === 'task' ? 'day' : 'task')}
      aria-label={
        isTaskFace
          ? 'Showing current task timer. Click to show remaining time in the day.'
          : 'Showing time remaining today. Click to show current task timer.'
      }
    >
      <DialRing />

      <div className="central-clock__content">
        {isTaskFace ? (
          <>
            <span className="central-clock__eyebrow" style={{ color: 'var(--accent-live)' }}>
              {currentTask.title.toUpperCase()}
            </span>
            <span className="central-clock__time">{secondsToClock(taskSecondsRemaining)}</span>
            <span className="central-clock__caption">{currentTask.description}</span>
          </>
        ) : (
          <>
            <span className="central-clock__eyebrow" style={{ color: 'var(--accent-next)' }}>
              TODAY · {nowAsClock()}
            </span>
            <span className="central-clock__time">{secondsToClock(daySeconds)}</span>
            <span className="central-clock__caption">REMAINING TODAY</span>
          </>
        )}
      </div>
    </button>
  )
}

/**
 * The 24 tick marks around the clock edge — a visual reference to the
 * 24-hour rule that governs the whole app.
 */
function DialRing() {
  const ticks = Array.from({ length: 24 })
  return (
    <svg className="central-clock__ring" viewBox="0 0 300 300" aria-hidden="true">
      {ticks.map((_, i) => {
        const angle = (i / 24) * 2 * Math.PI - Math.PI / 2
        const isMajor = i % 6 === 0
        const outer = 142
        const inner = isMajor ? 122 : 130
        const x1 = 150 + outer * Math.cos(angle)
        const y1 = 150 + outer * Math.sin(angle)
        const x2 = 150 + inner * Math.cos(angle)
        const y2 = 150 + inner * Math.sin(angle)
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={isMajor ? 'var(--text-muted)' : 'var(--panel-border)'}
            strokeWidth={isMajor ? 2 : 1}
            strokeLinecap="round"
          />
        )
      })}
    </svg>
  )
}

export default CentralClock
