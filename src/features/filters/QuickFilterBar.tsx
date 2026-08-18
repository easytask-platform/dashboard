import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BookmarkPlus, X } from 'lucide-react'
import { useSavedFiltersQuery, useCreateSavedFilter, useDeleteSavedFilter } from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils'

/**
 * Quick-filter chip bar (AF-14): tap a chip to apply its saved combination,
 * save the current combination under a name, ✕ to delete a chip.
 */
export function QuickFilterBar({
  currentFilters,
  hasActiveFilters,
  onApply,
}: {
  currentFilters: Record<string, string>
  hasActiveFilters: boolean
  onApply: (filters: Record<string, string>) => void
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const savedQuery = useSavedFiltersQuery()
  const createFilter = useCreateSavedFilter()
  const deleteFilter = useDeleteSavedFilter()
  const [saveOpen, setSaveOpen] = useState(false)
  const [name, setName] = useState('')
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})

  const saved = savedQuery.data ?? []
  if (saved.length === 0 && !hasActiveFilters) return null

  const save = async (event: React.FormEvent) => {
    event.preventDefault()
    setApiMessage(null)
    setApiFields({})
    try {
      await createFilter.mutateAsync({ name: name.trim(), filters: currentFilters })
      setSaveOpen(false)
      setName('')
      toast.success(t('savedFilters.saved'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  }

  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      {saved.map((filter) => (
        <span
          key={filter.id}
          className={cn(
            'flex items-center gap-1.5 rounded-full border border-line bg-surface py-1 pe-2 ps-3',
            'text-sm text-ink transition-colors hover:border-primary/50',
          )}
        >
          <button type="button" onClick={() => onApply(filter.filters)} className="font-medium">
            {filter.name}
          </button>
          <button
            type="button"
            aria-label={t('savedFilters.remove', { name: filter.name })}
            onClick={() =>
              deleteFilter
                .mutateAsync(filter.id)
                .catch((error) => toast.error(splitApiError(error).message ?? t('common.error')))
            }
            className="text-ink-soft hover:text-danger"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      {hasActiveFilters && (
        <Button variant="ghost" size="sm" onClick={() => setSaveOpen(true)}>
          <BookmarkPlus className="size-4" /> {t('savedFilters.saveCurrent')}
        </Button>
      )}

      <Dialog open={saveOpen} onClose={() => setSaveOpen(false)} title={t('savedFilters.saveTitle')}>
        <form onSubmit={save} className="space-y-4">
          <TextField
            label={t('savedFilters.name')}
            required
            maxLength={50}
            value={name}
            onChange={(event) => setName(event.target.value)}
            error={apiFields.name}
          />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setSaveOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createFilter.isPending || !name.trim()}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
