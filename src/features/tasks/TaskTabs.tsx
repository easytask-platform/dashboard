import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Download, Paperclip, Send, Trash2 } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import {
  useCommentsQuery,
  useAddComment,
  useDeleteComment,
  useAttachmentsQuery,
  useUploadAttachment,
  useDeleteAttachment,
  downloadAttachment,
  useTimeEntriesQuery,
  useAddTimeEntry,
  useDeleteTimeEntry,
  useActivityQuery,
} from './collab-api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Tab = 'comments' | 'attachments' | 'time' | 'activity'
const TABS: Tab[] = ['comments', 'attachments', 'time', 'activity']

export function TaskTabs({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>('comments')

  return (
    <section className="rounded-card border border-line bg-surface shadow-card">
      <div role="tablist" className="flex gap-1 border-b border-line px-3 pt-2">
        {TABS.map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              'rounded-t-lg px-4 py-2 text-sm font-medium transition-colors',
              tab === key
                ? 'border-b-2 border-primary text-primary'
                : 'text-ink-soft hover:text-ink',
            )}
          >
            {t(`collab.tabs.${key}`)}
          </button>
        ))}
      </div>
      <div className="p-5">
        {tab === 'comments' && <CommentsTab taskId={taskId} />}
        {tab === 'attachments' && <AttachmentsTab taskId={taskId} />}
        {tab === 'time' && <TimeTab taskId={taskId} />}
        {tab === 'activity' && <ActivityTab taskId={taskId} />}
      </div>
    </section>
  )
}

function CommentsTab({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const commentsQuery = useCommentsQuery(taskId)
  const addComment = useAddComment(taskId)
  const deleteComment = useDeleteComment(taskId)
  const [text, setText] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    try {
      await addComment.mutateAsync(text.trim())
      setText('')
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex gap-2">
        <input
          value={text}
          onChange={(event) => setText(event.target.value)}
          placeholder={t('collab.commentPlaceholder')}
          aria-label={t('collab.commentPlaceholder')}
          className="h-9 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-primary"
        />
        <Button type="submit" disabled={addComment.isPending || !text.trim()}>
          <Send className="size-4" /> {t('collab.post')}
        </Button>
      </form>

      {commentsQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : commentsQuery.data?.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('collab.noComments')}</p>
      ) : (
        <ul className="space-y-3">
          {commentsQuery.data?.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-line bg-paper p-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">{comment.author.fullName}</span>
                <span className="flex items-center gap-2 text-xs text-ink-soft">
                  {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
                  {comment.author.id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('common.delete')}
                      onClick={() => deleteComment.mutate(comment.id)}
                    >
                      <Trash2 className="size-3.5 text-danger" />
                    </Button>
                  )}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function AttachmentsTab({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const attachmentsQuery = useAttachmentsQuery(taskId)
  const upload = useUploadAttachment(taskId)
  const remove = useDeleteAttachment(taskId)
  const fileInput = useRef<HTMLInputElement>(null)

  const onPick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      await upload.mutateAsync(file)
      toast.success(t('collab.uploaded'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  const formatSize = (bytes: number) =>
    bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`

  return (
    <div className="space-y-4">
      <div>
        <input ref={fileInput} type="file" hidden onChange={onPick} aria-label={t('collab.upload')} />
        <Button variant="secondary" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
          <Paperclip className="size-4" /> {upload.isPending ? t('common.loading') : t('collab.upload')}
        </Button>
      </div>

      {attachmentsQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : attachmentsQuery.data?.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('collab.noAttachments')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {attachmentsQuery.data?.map((attachment) => (
            <li key={attachment.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{attachment.originalFilename}</p>
                <p className="text-xs text-ink-soft">
                  {formatSize(attachment.fileSize)} · {attachment.uploader.fullName} ·{' '}
                  {format(new Date(attachment.uploadedAt), 'yyyy-MM-dd')}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('collab.download', { name: attachment.originalFilename })}
                  onClick={() =>
                    downloadAttachment(attachment).catch(() => toast.error(t('common.error')))
                  }
                >
                  <Download className="size-4" />
                </Button>
                {attachment.uploader.id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('common.delete')}
                    onClick={() =>
                      remove
                        .mutateAsync(attachment.id)
                        .catch((error) => toast.error(splitApiError(error).message ?? t('common.error')))
                    }
                  >
                    <Trash2 className="size-4 text-danger" />
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function TimeTab({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const timeQuery = useTimeEntriesQuery(taskId)
  const addEntry = useAddTimeEntry(taskId)
  const deleteEntry = useDeleteTimeEntry(taskId)
  const [workDate, setWorkDate] = useState('')
  const [hours, setHours] = useState('')
  const [note, setNote] = useState('')

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      await addEntry.mutateAsync({ workDate, hoursSpent: Number(hours), note })
      setWorkDate('')
      setHours('')
      setNote('')
      toast.success(t('collab.timeLogged'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="flex flex-wrap items-end gap-2">
        <TextField
          label={t('collab.workDate')}
          type="date"
          required
          value={workDate}
          onChange={(event) => setWorkDate(event.target.value)}
        />
        <TextField
          label={t('collab.hoursSpent')}
          type="number"
          min={0.5}
          step="0.5"
          required
          value={hours}
          onChange={(event) => setHours(event.target.value)}
        />
        <TextField
          label={t('collab.note')}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          containerClassName="flex-1 min-w-40"
        />
        <Button type="submit" disabled={addEntry.isPending}>
          {t('collab.logTime')}
        </Button>
      </form>

      {timeQuery.data && (
        <p className="text-sm text-ink-soft">
          {t('collab.totalLogged')}{' '}
          <span className="font-semibold text-ink">
            {timeQuery.data.totalLoggedHours}
            {timeQuery.data.estimatedHours ? ` / ${timeQuery.data.estimatedHours}` : ''}
          </span>
        </p>
      )}

      {timeQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : timeQuery.data?.items.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('collab.noTime')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {timeQuery.data?.items.map((entry) => (
            <li key={entry.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  {entry.employee.fullName} — {entry.hoursSpent}h
                </p>
                <p className="truncate text-xs text-ink-soft">
                  {entry.workDate}
                  {entry.note ? ` · ${entry.note}` : ''}
                </p>
              </div>
              {entry.employee.id === user?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('common.delete')}
                  onClick={() =>
                    deleteEntry
                      .mutateAsync(entry.id)
                      .catch((error) => toast.error(splitApiError(error).message ?? t('common.error')))
                  }
                >
                  <Trash2 className="size-4 text-danger" />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function ActivityTab({ taskId }: { taskId: string }) {
  const { t } = useTranslation()
  const activityQuery = useActivityQuery(taskId)

  return activityQuery.isLoading ? (
    <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
  ) : activityQuery.data?.length === 0 ? (
    <p className="py-4 text-center text-sm text-ink-soft">{t('collab.noActivity')}</p>
  ) : (
    <ol className="space-y-3">
      {activityQuery.data?.map((event) => (
        <li key={event.id} className="flex gap-3 text-sm">
          <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden />
          <div>
            <p>
              <span className="font-medium">{event.actor.fullName}</span>{' '}
              <span className="text-ink-soft">{t(`collab.events.${event.eventType}`, event.eventType)}</span>
              {event.oldValue && event.newValue && (
                <span className="text-ink-soft">
                  {' — '}
                  {t('collab.statusChange', {
                    from: t(`status.${event.oldValue}`, event.oldValue),
                    to: t(`status.${event.newValue}`, event.newValue),
                  })}
                </span>
              )}
            </p>
            <p className="text-xs text-ink-soft">{format(new Date(event.createdAt), 'yyyy-MM-dd HH:mm')}</p>
          </div>
        </li>
      ))}
    </ol>
  )
}
