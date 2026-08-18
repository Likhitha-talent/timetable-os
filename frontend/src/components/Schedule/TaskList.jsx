import TaskItem from './TaskItem.jsx'
import './TaskList.css'

/**
 * Renders the full schedule as a vertical list, in chronological
 * order. TaskItem handles the visual difference between statuses.
 */
function TaskList({ schedule }) {
  return (
    <ul className="task-list">
      {schedule.map((task) => (
        <TaskItem key={task.id} task={task} />
      ))}
    </ul>
  )
}

export default TaskList
