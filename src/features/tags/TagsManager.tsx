import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Can } from '@/features/auth/auth-context'
import { useProjectTagsQuery, useCreateTag, useUpdateTag, useDeleteTag, type Tag } from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog'
import { TextField, FormError } from '@/components/ui/Field'
import { TagChip } from '@/components/ui/TagChip'
import { useToast } from '@/components/ui/Toast'

const PRESET_COLORS = ['#5560c1', '#0e9f8a', '#8b5cf6', '#ea580c', '#dc2626', '#2563eb', '#16a34a', '#d97706']

/** Project tag CRUD (P4-3/D32, FR-27). Rendered on the project details sidebar. */
export function TagsManager({ projectId }: { projectId: string }) {
  const { t } = useTranslation()
  const toast = useToast()
  const tagsQuery = useProjectTagsQuery(projectId)
  const createTag = useCreateTag(projectId)
  const updateTag = useUpdateTag(projectId)
  const deleteTag = useDeleteTag(projectId)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState<Tag | null>(null)
  const [name, setName] = useState('')
  const [color, setColor] = useState(PRESET_COLORS[0])
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})

  const openForm = (tag: Tag | null) => {
    setEditing(tag)
    setName(tag?.name ?? '')
    setColor(tag?.color ?? PRESET_COLORS[(tagsQuery.data?.length ?? 0) % PRESET_COLORS.length])
    setApiMessage(null)
    setApiFields({})
    setFormOpen(true)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      if (editing) await updateTag.mutateAsync({ tagId: editing.id, name: name.trim(), color })
      else await createTag.mutateAsync({ name: name.trim(), color })
      setFormOpen(false)
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  }

  return (
    <section className="rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('tags.title')}</h2>
        <Can permission="task:manage">
          <Button variant="ghost" size="sm" onClick={() => openForm(null)}>
            <Plus className="size-4" /> {t('tags.add')}
          </Button>
        </Can>
      </div>

      {tagsQuery.data?.length === 0 ? (
        <p className="text-sm text-ink-soft">{t('tags.empty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {tagsQuery.data?.map((tag) => (
            <li key={tag.id} className="flex items-center justify-between gap-2">
              <TagChip name={tag.name} color={tag.color} />
              <Can permission="task:manage">
                <span className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={t('tags.edit', { name: tag.name })}
                    onClick={() => openForm(tag)}
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7"
                    aria-label={t('tags.delete', { name: tag.name })}
                    onClick={() => setDeleting(tag)}
                  >
                    <Trash2 className="size-3.5 text-danger" />
                  </Button>
                </span>
              </Can>
            </li>
          ))}
        </ul>
      )}

      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? t('tags.editTitle') : t('tags.add')}
      >
        <form onSubmit={submit} className="space-y-4">
          <TextField
            label={t('tags.name')}
            required
            maxLength={30}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={apiFields.name}
          />
          <div>
            <p className="mb-1.5 text-sm font-medium">{t('tags.color')}</p>
            <div className="flex flex-wrap items-center gap-2">
              {PRESET_COLORS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-label={preset}
                  aria-pressed={color === preset}
                  onClick={() => setColor(preset)}
                  className="size-7 rounded-full border-2 transition-transform aria-pressed:scale-110"
                  style={{ backgroundColor: preset, borderColor: color === preset ? 'var(--color-ink)' : 'transparent' }}
                />
              ))}
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                aria-label={t('tags.customColor')}
                className="size-7 cursor-pointer rounded-full border border-line bg-transparent"
              />
            </div>
            {apiFields.color && <p className="mt-1 text-xs text-danger">{apiFields.color}</p>}
          </div>
          <div className="rounded-lg border border-line bg-paper p-3">
            <TagChip name={name || t('tags.preview')} color={color} />
          </div>
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setFormOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTag.isPending || updateTag.isPending || !name.trim()}>
              {editing ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={t('tags.deleteTitle')}
        message={t('tags.deleteConfirm', { name: deleting?.name })}
        confirmLabel={t('common.delete')}
        danger
        busy={deleteTag.isPending}
        onConfirm={async () => {
          if (!deleting) return
          try {
            await deleteTag.mutateAsync(deleting.id)
            setDeleting(null)
          } catch (error) {
            toast.error(splitApiError(error).message ?? t('common.error'))
          }
        }}
        onClose={() => setDeleting(null)}
      />
    </section>
  )
}
