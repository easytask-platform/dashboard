import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react'
import {
  useChecklistQuery,
  useAddChecklistItem,
  useUpdateChecklistItem,
  useDeleteChecklistItem,
  type ChecklistItem,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

/**
 * Task checklist (P4-5/D36, AF-01/02). Managers manage items; assignees may
 * tick them off (`canToggle`); everyone sees progress.
 */
export function ChecklistSection({
  taskId,
  canManage,
  canToggle,
}: {
  taskId: string
  canManage: boolean
  canToggle: boolean
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const checklistQuery = useChecklistQuery(taskId)
  const addItem = useAddChecklistItem(taskId)
  const updateItem = useUpdateChecklistItem(taskId)
  const deleteItem = useDeleteChecklistItem(taskId)
  const [title, setTitle] = useState('')

  const items = checklistQuery.data ?? []
  const done = items.filter((item) => item.done).length
  if (!canManage && items.length === 0) return null

  const onError = (error: unknown) => toast.error(splitApiError(error).message ?? t('common.error'))

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!title.trim()) return
    try {
      await addItem.mutateAsync(title.trim())
      setTitle('')
    } catch (error) {
      onError(error)
    }
  }

  const move = (item: ChecklistItem, direction: -1 | 1) => {
    const index = items.indexOf(item)
    const neighbour = items[index + direction]
    if (!neighbour) return
    // Swap positions; the server returns the list ordered by position.
    updateItem.mutateAsync({ itemId: item.id, position: neighbour.position }).catch(onError)
    updateItem.mutateAsync({ itemId: neighbour.id, position: item.position }).catch(onError)
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">
          {t('checklist.title')}{' '}
          {items.length > 0 && (
            <span className="text-ink-soft">
              {done}/{items.length}
            </span>
          )}
        </h2>
      </div>

      {items.length > 0 && (
        <>
          <div
            className="mb-3 h-1.5 overflow-hidden rounded-full bg-paper"
            role="progressbar"
            aria-valuenow={done}
            aria-valuemax={items.length}
            aria-label={t('checklist.progress')}
          >
            <div
              className="h-full rounded-full bg-success transition-all"
              style={{ width: `${(done / items.length) * 100}%` }}
            />
          </div>
          <ul className="mb-3 space-y-1">
            {items.map((item, index) => (
              <li key={item.id} className="group flex items-center gap-2 rounded-lg px-1 py-1 hover:bg-paper">
                <input
                  type="checkbox"
                  checked={item.done}
                  disabled={!canToggle || updateItem.isPending}
                  onChange={() =>
                    updateItem.mutateAsync({ itemId: item.id, done: !item.done }).catch(onError)
                  }
                  aria-label={item.title}
                  className="accent-(--color-success)"
                />
                <span className={item.done ? 'flex-1 text-sm text-ink-soft line-through' : 'flex-1 text-sm'}>
                  {item.title}
                </span>
                {canManage && (
                  <span className="hidden shrink-0 gap-0.5 group-hover:flex">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('checklist.moveUp', { title: item.title })}
                      disabled={index === 0}
                      onClick={() => move(item, -1)}
                    >
                      <ChevronUp className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('checklist.moveDown', { title: item.title })}
                      disabled={index === items.length - 1}
                      onClick={() => move(item, 1)}
                    >
                      <ChevronDown className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-6"
                      aria-label={t('checklist.remove', { title: item.title })}
                      onClick={() => deleteItem.mutateAsync(item.id).catch(onError)}
                    >
                      <Trash2 className="size-3.5 text-danger" />
                    </Button>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </>
      )}

      {canManage && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={150}
            placeholder={t('checklist.addPlaceholder')}
            aria-label={t('checklist.addPlaceholder')}
            className="h-8 flex-1 rounded-lg border border-line bg-paper px-3 text-sm outline-none focus:border-primary"
          />
          <Button type="submit" size="sm" variant="secondary" disabled={addItem.isPending || !title.trim()}>
            <Plus className="size-4" /> {t('checklist.add')}
          </Button>
        </form>
      )}
    </section>
  )
}
