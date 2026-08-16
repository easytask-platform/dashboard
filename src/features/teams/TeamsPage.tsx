import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, UsersRound } from 'lucide-react'
import { useAuth } from '@/features/auth/auth-context'
import {
  useTeamsQuery,
  useCreateTeam,
  useUpdateTeam,
  useTeamMembersQuery,
  useAddTeamMember,
  useRemoveTeamMember,
  type Team,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader, SearchInput } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/Button'
import { Dialog } from '@/components/ui/Dialog'
import { TextField, TextAreaField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { MembersManager } from '@/components/MembersManager'

interface TeamForm {
  name: string
  description: string
}

export function TeamsPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const canManage = hasPermission('team:manage')

  const [filters, setFilters] = useState({ search: '', page: 0 })
  const teamsQuery = useTeamsQuery(filters)
  const createTeam = useCreateTeam()
  const updateTeam = useUpdateTeam()

  const [creating, setCreating] = useState(false)
  const [editing, setEditing] = useState<Team | null>(null)
  const [membersOf, setMembersOf] = useState<Team | null>(null)
  const membersQuery = useTeamMembersQuery(membersOf?.id ?? null)
  const addMember = useAddTeamMember()
  const removeMember = useRemoveTeamMember()

  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const form = useForm<TeamForm>()

  const openCreate = () => {
    form.reset({ name: '', description: '' })
    setApiMessage(null)
    setApiFields({})
    setCreating(true)
  }

  const openEdit = (team: Team) => {
    form.reset({ name: team.name, description: team.description ?? '' })
    setApiMessage(null)
    setApiFields({})
    setEditing(team)
  }

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
  }

  const submit = form.handleSubmit(async (values) => {
    setApiMessage(null)
    setApiFields({})
    try {
      if (editing) await updateTeam.mutateAsync({ teamId: editing.id, ...values })
      else await createTeam.mutateAsync(values)
      closeForm()
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  const columns: Column<Team>[] = [
    { key: 'name', header: t('common.name'), render: (team) => <span className="font-medium">{team.name}</span> },
    {
      key: 'description',
      header: t('common.description'),
      render: (team) => <span className="text-ink-soft">{team.description}</span>,
    },
    { key: 'members', header: t('teams.members'), render: (team) => <span>{team.memberCount}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      className: 'w-24',
      render: (team) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon" aria-label={t('teams.members')} onClick={() => setMembersOf(team)}>
            <UsersRound className="size-4" />
          </Button>
          {canManage && (
            <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => openEdit(team)}>
              <Pencil className="size-4" />
            </Button>
          )}
        </div>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title={t('nav.teams')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> {t('teams.create')}
            </Button>
          )
        }
      />

      <div className="mb-4">
        <SearchInput value={filters.search} onChange={(search) => setFilters({ search, page: 0 })} />
      </div>

      <DataTable
        columns={columns}
        rows={teamsQuery.data?.items ?? []}
        rowKey={(team) => team.id}
        loading={teamsQuery.isLoading}
      />
      <Pagination page={teamsQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <Dialog
        open={creating || editing !== null}
        onClose={closeForm}
        title={editing ? t('teams.edit') : t('teams.create')}
      >
        <form onSubmit={submit} className="space-y-4">
          <TextField label={t('common.name')} required error={apiFields.name} {...form.register('name')} />
          <TextAreaField
            label={t('common.description')}
            error={apiFields.description}
            {...form.register('description')}
          />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createTeam.isPending || updateTeam.isPending}>
              {editing ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={membersOf !== null}
        onClose={() => setMembersOf(null)}
        title={t('teams.membersOf', { name: membersOf?.name })}
      >
        <MembersManager
          members={membersQuery.data}
          loading={membersQuery.isLoading}
          canManage={canManage}
          onAdd={(userId) => addMember.mutateAsync({ teamId: membersOf!.id, userId })}
          onRemove={(userId) => removeMember.mutateAsync({ teamId: membersOf!.id, userId })}
        />
      </Dialog>
    </div>
  )
}
