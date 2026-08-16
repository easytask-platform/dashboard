import { useNavigate } from 'react-router'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { STATUS_COLORS } from '@/components/ui/Badge'
import type { TaskListItem } from './api'

/** Month calendar of task due dates; click opens the task. */
export function CalendarView({ tasks }: { tasks: TaskListItem[] }) {
  const navigate = useNavigate()
  const isRtl = document.documentElement.dir === 'rtl'

  return (
    <div className="rounded-card border border-line bg-surface p-4 shadow-card">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        direction={isRtl ? 'rtl' : 'ltr'}
        height="auto"
        headerToolbar={{ start: 'title', center: '', end: 'today prev,next' }}
        events={tasks
          .filter((task) => task.dueDate)
          .map((task) => ({
            id: task.id,
            title: task.title,
            date: task.dueDate!,
            backgroundColor: STATUS_COLORS[task.status],
            borderColor: STATUS_COLORS[task.status],
          }))}
        eventClick={(info) => navigate(`/tasks/${info.event.id}`)}
      />
    </div>
  )
}
