import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { UserRoundMinus, UserRoundPlus } from 'lucide-react'
import { useUsersQuery } from '@/features/users/api'
import type { Member } from '@/features/teams/api'
import { splitApiError } from '@/lib/api/form-errors'
import { Button } from '@/components/ui/Button'
import { RoleBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface MembersManagerProps {
  members: Member[] | undefined
  loading: boolean
  canManage: boolean
  onAdd: (userId: string) => Promise<unknown>
  onRemove: (userId: string) => Promise<unknown>
}

/** Member list + add/remove — shared by team and project membership. */
export function MembersManager({ members, loading, canManage, onAdd, onRemove }: MembersManagerProps) {
  const { t } = useTranslation()
  const toast = useToast()
  const [selected, setSelected] = useState('')
  const [busy, setBusy] = useState(false)
  // Full active user list for the picker (admins/managers only reach this UI).
  const usersQuery = useUsersQuery({ search: '', role: '', active: 'true', page: 0 })

  const memberIds = new Set(members?.map((member) => member.id))
  const candidates = usersQuery.data?.items.filter((user) => !memberIds.has(user.id)) ?? []

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true)
    try {
      await action()
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {canManage && (
        <div className="mb-3 flex gap-2">
          <select
            value={selected}
            onChange={(event) => setSelected(event.target.value)}
            aria-label={t('members.pickUser')}
            className="h-9 flex-1 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary"
          >
            <option value="">{t('members.pickUser')}</option>
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {user.fullName} — {user.email}
              </option>
            ))}
          </select>
          <Button
            disabled={!selected || busy}
            onClick={() =>
              run(async () => {
                await onAdd(selected)
                setSelected('')
              })
            }
          >
            <UserRoundPlus className="size-4" /> {t('members.add')}
          </Button>
        </div>
      )}

      {loading ? (
        <p className="py-6 text-center text-sm text-ink-soft">{t('common.loading')}</p>
      ) : members?.length === 0 ? (
        <p className="py-6 text-center text-sm text-ink-soft">{t('members.empty')}</p>
      ) : (
        <ul className="divide-y divide-line rounded-lg border border-line">
          {members?.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{member.fullName}</p>
                <p className="truncate text-xs text-ink-soft">{member.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <RoleBadge role={member.role} />
                {canManage && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('members.remove', { name: member.fullName })}
                    disabled={busy}
                    onClick={() => run(() => onRemove(member.id))}
                  >
                    <UserRoundMinus className="size-4 text-danger" />
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
