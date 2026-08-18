import { useState, useEffect, useRef } from 'react'
import { getEndTimestamp, getSecondsRemaining } from '../services/timerService.js'

/**
 * A reusable countdown hook. Give it a duration in minutes, and it
 * returns the live seconds remaining, recalculated every second from
 * a fixed end timestamp (not by decrementing a number), so it can't drift.
 */
export function useTaskTimer(durationMinutes) {
  const endTimestampRef = useRef(getEndTimestamp(durationMinutes))
  const [secondsRemaining, setSecondsRemaining] = useState(
    getSecondsRemaining(endTimestampRef.current)
  )

  // Reset the timer whenever the duration changes (e.g. "+15 MIN" applied).
  useEffect(() => {
    endTimestampRef.current = getEndTimestamp(durationMinutes)
    setSecondsRemaining(getSecondsRemaining(endTimestampRef.current))
  }, [durationMinutes])

  useEffect(() => {
    const intervalId = setInterval(() => {
      setSecondsRemaining(getSecondsRemaining(endTimestampRef.current))
    }, 1000)
    return () => clearInterval(intervalId)
  }, [])

  function addMinutes(extraMinutes) {
    endTimestampRef.current += extraMinutes * 60 * 1000
    setSecondsRemaining(getSecondsRemaining(endTimestampRef.current))
  }

  return { secondsRemaining, addMinutes }
}
