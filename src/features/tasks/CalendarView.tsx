import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import { STATUS_COLORS, StatusBadge, PriorityBadge } from '@/components/ui/Badge'
import type { TaskListItem } from './api'

/**
 * Calendar of task due dates (P3-5/D29): month AND week views, click a day
 * to list that day's tasks below, click an event/task to open it.
 */
export function CalendarView({ tasks }: { tasks: TaskListItem[] }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const isRtl = document.documentElement.dir === 'rtl'
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const tasksOn = (date: string) => tasks.filter((task) => task.dueDate === date)

  return (
    <div className="space-y-4">
      <div className="rounded-card border border-line bg-surface p-4 shadow-card">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          direction={isRtl ? 'rtl' : 'ltr'}
          height="auto"
          headerToolbar={{ start: 'title', center: 'dayGridMonth,dayGridWeek', end: 'today prev,next' }}
          buttonText={{ today: t('calendar.today'), month: t('calendar.month'), week: t('calendar.week') }}
          dateClick={(info) => setSelectedDate(info.dateStr)}
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

      {selectedDate && (
        <section className="rounded-card border border-line bg-surface p-4 shadow-card">
          <h3 className="mb-3 text-sm font-semibold">
            {t('calendar.dueOn', { date: selectedDate })}{' '}
            <span className="font-normal text-ink-soft">({tasksOn(selectedDate).length})</span>
          </h3>
          {tasksOn(selectedDate).length === 0 ? (
            <p className="text-sm text-ink-soft">{t('calendar.nothingDue')}</p>
          ) : (
            <ul className="divide-y divide-line">
              {tasksOn(selectedDate).map((task) => (
                <li key={task.id}>
                  <button
                    onClick={() => navigate(`/tasks/${task.id}`)}
                    className="flex w-full items-center justify-between gap-3 py-2.5 text-start hover:bg-paper"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{task.title}</span>
                      <span className="block text-xs text-ink-soft">{task.projectName}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-2">
                      <PriorityBadge priority={task.priority} />
                      <StatusBadge status={task.status} />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  )
}
