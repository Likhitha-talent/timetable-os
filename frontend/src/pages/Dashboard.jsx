import { useState, useEffect } from 'react'
import CentralClock from '../components/Clock/CentralClock.jsx'
import TaskList from '../components/Schedule/TaskList.jsx'
import TaskControls from '../components/Controls/TaskControls.jsx'
import ChatPanel from '../components/Chat/ChatPanel.jsx'
import { getSchedule, completeTask as apiCompleteTask } from '../services/api.js'
import { groupTasksByStatus, validateSchedule } from '../services/scheduleEngine.js'
import './Dashboard.css'

/**
 * The main screen. Holds the schedule in state, and passes pieces of
 * it down to the smaller components. This is the only place that
 * currently "owns" the schedule — components ask it to make changes
 * rather than changing schedule data themselves.
 */
function Dashboard() {
  const [schedule, setSchedule] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    getSchedule().then((data) => {
      setSchedule(data)
      setIsLoading(false)
    })
  }, [])

  const { completed, current, upcoming } = groupTasksByStatus(schedule)
  const validation = validateSchedule(schedule)

  function handleAddTime(taskId, extraMinutes) {
    setSchedule((prev) =>
      prev.map((task) =>
        task.id === taskId
          ? { ...task, durationMinutes: task.durationMinutes + extraMinutes }
          : task
      )
    )
    // Full recalculation of the *rest* of the schedule (shifting
    // flexible tasks, etc.) is built in a later step, per scheduleEngine.
  }

  function handleComplete(taskId) {
    const currentIndex = schedule.findIndex((t) => t.id === taskId)
    if (currentIndex === -1) return

    setSchedule((prev) =>
      prev.map((task, i) => {
        if (task.id === taskId) return { ...task, status: 'completed' }
        if (i === currentIndex + 1) return { ...task, status: 'current' }
        return task
      })
    )
    apiCompleteTask(taskId)
  }

  if (isLoading) {
    return (
      <div className="dashboard dashboard--loading">
        <p>Loading your schedule…</p>
      </div>
    )
  }

  return (
    <div className="dashboard">
      <header className="dashboard__header">
        <span className="dashboard__eyebrow">TODAY</span>
        {!validation.isValid && (
          <span className="dashboard__warning" role="alert">
            Schedule exceeds 24 hours by {validation.overflowMinutes} min
          </span>
        )}
      </header>

      <main className="dashboard__main">
        <section className="dashboard__clock-column">
          <CentralClock currentTask={current} />

          {current && (
            <div className="dashboard__current-task">
              <TaskControls
                currentTask={current}
                nextTask={upcoming[0]}
                onAddTime={handleAddTime}
                onComplete={handleComplete}
              />
            </div>
          )}
        </section>

        <section className="dashboard__side-column">
          <h2 className="dashboard__section-title">Schedule</h2>
          <TaskList schedule={[...completed, ...(current ? [current] : []), ...upcoming]} />

          <ChatPanel />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
