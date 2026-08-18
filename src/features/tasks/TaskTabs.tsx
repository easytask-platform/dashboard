import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { format } from 'date-fns'
import { Check, CornerDownRight, Download, Paperclip, Pencil, Reply, Send, Trash2, X } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import { useProjectMembersQuery } from '@/features/projects/api'
import {
  useCommentsQuery,
  useAddComment,
  useUpdateComment,
  useDeleteComment,
  useAttachmentsQuery,
  useUploadAttachment,
  useDeleteAttachment,
  downloadAttachment,
  useTimeEntriesQuery,
  useAddTimeEntry,
  useDeleteTimeEntry,
  useActivityQuery,
  type TaskComment,
} from './collab-api'
import { splitApiError } from '@/lib/api/form-errors'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { TextField } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

type Tab = 'comments' | 'attachments' | 'time' | 'activity'
const TABS: Tab[] = ['comments', 'attachments', 'time', 'activity']

export function TaskTabs({ taskId, projectId }: { taskId: string; projectId?: string }) {
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
        {tab === 'comments' && <CommentsTab taskId={taskId} projectId={projectId} />}
        {tab === 'attachments' && <AttachmentsTab taskId={taskId} />}
        {tab === 'time' && <TimeTab taskId={taskId} />}
        {tab === 'activity' && <ActivityTab taskId={taskId} />}
      </div>
    </section>
  )
}

function CommentsTab({ taskId, projectId }: { taskId: string; projectId?: string }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const toast = useToast()
  const commentsQuery = useCommentsQuery(taskId)
  const addComment = useAddComment(taskId)
  const updateComment = useUpdateComment(taskId)
  const deleteComment = useDeleteComment(taskId)
  const [text, setText] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  // One-level threading (D34) + explicit mentions (D35)
  const [replyTo, setReplyTo] = useState<TaskComment | null>(null)
  const [mentioned, setMentioned] = useState<Map<string, string>>(new Map())
  const membersQuery = useProjectMembersQuery(projectId ?? '')
  const inputRef = useRef<HTMLInputElement>(null)

  // The trailing "@query" fragment of the draft drives the autocomplete.
  const mentionMatch = /(^|\s)@([\p{L}\p{N}]*(?: [\p{L}\p{N}]*)?)$/u.exec(text)
  const mentionQuery = mentionMatch?.[2] ?? null
  const mentionCandidates = useMemo(() => {
    if (mentionQuery === null) return []
    const query = mentionQuery.toLowerCase()
    return (membersQuery.data ?? [])
      .filter((member) => member.id !== user?.id && member.fullName.toLowerCase().includes(query))
      .slice(0, 5)
  }, [mentionQuery, membersQuery.data, user?.id])

  const pickMention = (memberId: string, fullName: string) => {
    setText((current) => current.replace(/@([\p{L}\p{N}]*(?: [\p{L}\p{N}]*)?)$/u, `@${fullName} `))
    setMentioned((current) => new Map(current).set(memberId, fullName))
    inputRef.current?.focus()
  }

  const replies = useMemo(() => {
    const byParent = new Map<string, TaskComment[]>()
    for (const comment of commentsQuery.data ?? []) {
      if (!comment.parentCommentId) continue
      byParent.set(comment.parentCommentId, [...(byParent.get(comment.parentCommentId) ?? []), comment])
    }
    return byParent
  }, [commentsQuery.data])
  const topLevel = commentsQuery.data?.filter((comment) => !comment.parentCommentId)

  const saveEdit = async () => {
    if (!editingId || !editText.trim()) return
    try {
      await updateComment.mutateAsync({ commentId: editingId, text: editText.trim() })
      setEditingId(null)
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!text.trim()) return
    // Only mentions whose "@Full Name" survived editing are sent.
    const mentionedUserIds = [...mentioned.entries()]
      .filter(([, fullName]) => text.includes(`@${fullName}`))
      .map(([id]) => id)
    try {
      await addComment.mutateAsync({
        text: text.trim(),
        parentCommentId: replyTo?.id,
        mentionedUserIds: mentionedUserIds.length > 0 ? mentionedUserIds : undefined,
      })
      setText('')
      setReplyTo(null)
      setMentioned(new Map())
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  return (
    <div className="space-y-4">
      <form onSubmit={submit} className="space-y-2">
        {replyTo && (
          <p className="flex w-fit items-center gap-2 rounded-lg bg-primary-soft px-3 py-1.5 text-xs text-primary-deep">
            <CornerDownRight className="size-3.5" aria-hidden />
            {t('collab.replyingTo', { name: replyTo.author.fullName })}
            <button
              type="button"
              aria-label={t('collab.cancelReply')}
              onClick={() => setReplyTo(null)}
              className="hover:text-ink"
            >
              <X className="size-3.5" />
            </button>
          </p>
        )}
        <div className="relative flex gap-2">
          <input
            ref={inputRef}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={t('collab.commentPlaceholder')}
            aria-label={t('collab.commentPlaceholder')}
            className="h-9 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" disabled={addComment.isPending || !text.trim()}>
            <Send className="size-4" /> {t('collab.post')}
          </Button>
          {mentionCandidates.length > 0 && (
            <ul
              role="listbox"
              aria-label={t('collab.mentionSuggestions')}
              className="absolute start-0 top-10 z-10 w-64 overflow-hidden rounded-lg border border-line bg-surface shadow-card"
            >
              {mentionCandidates.map((member) => (
                <li key={member.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => pickMention(member.id, member.fullName)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm hover:bg-paper"
                  >
                    <Avatar person={member} size="xs" />
                    {member.fullName}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </form>

      {commentsQuery.isLoading ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : commentsQuery.data?.length === 0 ? (
        <p className="py-4 text-center text-sm text-ink-soft">{t('collab.noComments')}</p>
      ) : (
        <ul className="space-y-3">
          {topLevel?.map((comment) => (
            <li key={comment.id} className="rounded-lg border border-line bg-paper p-3">
              {renderComment(comment, true)}
              {(replies.get(comment.id)?.length ?? 0) > 0 && (
                <ul className="ms-6 mt-2 space-y-2 border-s-2 border-line ps-3">
                  {replies.get(comment.id)?.map((reply) => (
                    <li key={reply.id}>{renderComment(reply, false)}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  function renderComment(comment: TaskComment, isTopLevel: boolean) {
    return (
      <>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="flex items-center gap-2 text-sm font-medium">
            <Avatar person={comment.author} size={isTopLevel ? 'sm' : 'xs'} />
            {comment.author.fullName}
          </span>
          <span className="flex items-center gap-2 text-xs text-ink-soft">
            {format(new Date(comment.createdAt), 'yyyy-MM-dd HH:mm')}
            {isTopLevel && editingId !== comment.id && (
              <Button
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={t('collab.reply', { name: comment.author.fullName })}
                onClick={() => {
                  setReplyTo(comment)
                  inputRef.current?.focus()
                }}
              >
                <Reply className="size-3.5" />
              </Button>
            )}
            {comment.author.id === user?.id && editingId !== comment.id && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={t('common.edit')}
                  onClick={() => {
                    setEditingId(comment.id)
                    setEditText(comment.text)
                  }}
                >
                  <Pencil className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={t('common.delete')}
                  onClick={() => deleteComment.mutate(comment.id)}
                >
                  <Trash2 className="size-3.5 text-danger" />
                </Button>
              </>
            )}
          </span>
        </div>
        {editingId === comment.id ? (
          <div className="flex items-center gap-2">
            <input
              value={editText}
              onChange={(event) => setEditText(event.target.value)}
              aria-label={t('collab.editComment')}
              className="h-8 flex-1 rounded-lg border border-line bg-surface px-2 text-sm outline-none focus:border-primary"
            />
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t('common.save')}
              disabled={updateComment.isPending}
              onClick={() => void saveEdit()}
            >
              <Check className="size-4 text-success" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              aria-label={t('common.cancel')}
              onClick={() => setEditingId(null)}
            >
              <X className="size-4" />
            </Button>
          </div>
        ) : (
          <p className="text-sm whitespace-pre-wrap">{comment.text}</p>
        )}
      </>
    )
  }
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
          <Avatar person={event.actor} size="xs" className="mt-0.5" />
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
