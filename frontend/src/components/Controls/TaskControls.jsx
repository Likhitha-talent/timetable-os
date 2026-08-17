import { useState } from 'react'
import { minutesToLabel } from '../../utils/timeUtils.js'
import './TaskControls.css'

/**
 * The +15 MIN / DONE buttons under the current task.
 * +15 MIN shows a confirmation preview first (per the spec: never
 * silently change the schedule) before actually applying anything.
 */
function TaskControls({ currentTask, onAddTime, onComplete, nextTask }) {
  const [showConfirm, setShowConfirm] = useState(false)

  if (!currentTask) return null

  return (
    <div className="task-controls">
      <button
        className="task-controls__btn task-controls__btn--ghost"
        onClick={() => setShowConfirm(true)}
      >
        + 15 MIN
      </button>
      <button
        className="task-controls__btn task-controls__btn--done"
        onClick={() => onComplete(currentTask.id)}
      >
        DONE
      </button>

      {showConfirm && (
        <div className="task-controls__confirm" role="dialog" aria-label="Confirm adding 15 minutes">
          <p>
            Add 15 minutes to <strong>{currentTask.title}</strong>?
          </p>
          <p className="task-controls__confirm-note">
            This will shift your remaining schedule by 15 minutes.
            {nextTask && (
              <>
                {' '}
                <strong>{nextTask.title}</strong>: {minutesToLabel(nextTask.durationMinutes)} →{' '}
                {minutesToLabel(Math.max(0, nextTask.durationMinutes - 15))}
              </>
            )}
          </p>
          <div className="task-controls__confirm-actions">
            <button
              className="task-controls__btn task-controls__btn--ghost"
              onClick={() => setShowConfirm(false)}
            >
              Cancel
            </button>
            <button
              className="task-controls__btn task-controls__btn--done"
              onClick={() => {
                onAddTime(currentTask.id, 15)
                setShowConfirm(false)
              }}
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default TaskControls
