import { minutesToLabel } from '../../utils/timeUtils.js'
import './TaskItem.css'

/**
 * A single row in the task list. Visual weight changes with status:
 * current = dominant, upcoming = quiet, completed = subdued.
 * Status is shown with both a symbol AND text, not just color,
 * so it doesn't rely on color perception alone (accessibility).
 */
function TaskItem({ task }) {
  const symbol = { completed: '✓', current: '●', upcoming: '○' }[task.status] || '○'

  return (
    <li className={`task-item task-item--${task.status}`}>
      <span className="task-item__symbol" aria-hidden="true">
        {symbol}
      </span>
      <div className="task-item__body">
        <span className="task-item__title">{task.title}</span>
        <span className="task-item__meta">
          {task.status === 'completed'
            ? `${task.startTime} — ${task.endTime}`
            : minutesToLabel(task.durationMinutes)}
        </span>
      </div>
      <span className="task-item__status-label">{task.status}</span>
    </li>
  )
}

export default TaskItem
