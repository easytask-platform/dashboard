import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyRound, Plus, UserRoundX, Pencil } from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/features/auth/auth-context'
import { useRolesQuery } from '@/features/roles/api'
import {
  useUsersQuery,
  useCreateUser,
  useUpdateUser,
  useDeactivateUser,
  useAdminResetPassword,
  type User,
  type UserFilters,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader, SearchInput } from '@/components/ui/PageHeader'
import { DataTable, Pagination, type Column } from '@/components/ui/DataTable'
import { ActiveBadge, RoleBadge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { TextField, SelectField, FormError } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

interface UserForm {
  fullName: string
  email: string
  initialPassword: string
  roleId: string
}

export function UsersPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const toast = useToast()
  const canManage = hasPermission('user:manage')

  const [filters, setFilters] = useState<UserFilters>({ search: '', role: '', active: '', page: 0 })
  const usersQuery = useUsersQuery(filters)
  const rolesQuery = useRolesQuery()

  const [editing, setEditing] = useState<User | null>(null)
  const [creating, setCreating] = useState(false)
  const [inviteMode, setInviteMode] = useState(true)
  const [deactivating, setDeactivating] = useState<User | null>(null)
  const [resetting, setResetting] = useState<User | null>(null)

  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const deactivateUser = useDeactivateUser()
  const resetPassword = useAdminResetPassword()

  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const form = useForm<UserForm>()

  const openCreate = () => {
    form.reset({ fullName: '', email: '', initialPassword: '', roleId: '' })
    setInviteMode(true)
    setApiMessage(null)
    setApiFields({})
    setCreating(true)
  }

  const openEdit = (user: User) => {
    form.reset({ fullName: user.fullName, email: user.email, initialPassword: '', roleId: user.roleId })
    setApiMessage(null)
    setApiFields({})
    setEditing(user)
  }

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
  }

  const submit = form.handleSubmit(async (values) => {
    setApiMessage(null)
    setApiFields({})
    try {
      if (editing) {
        await updateUser.mutateAsync({ userId: editing.id, fullName: values.fullName, roleId: values.roleId })
      } else {
        // Invite mode (P3-2): omit the password — the backend emails a code.
        await createUser.mutateAsync({
          fullName: values.fullName,
          email: values.email,
          roleId: values.roleId,
          ...(inviteMode ? {} : { initialPassword: values.initialPassword }),
        })
      }
      closeForm()
      toast.success(editing ? t('common.save') : inviteMode ? t('users.invited') : t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  const confirmDeactivate = async () => {
    if (!deactivating) return
    try {
      await deactivateUser.mutateAsync(deactivating.id)
      toast.success(t('users.deactivated'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setDeactivating(null)
    }
  }

  const resetForm = useForm<{ newPassword: string }>()
  const submitReset = resetForm.handleSubmit(async ({ newPassword }) => {
    if (!resetting) return
    setApiMessage(null)
    setApiFields({})
    try {
      await resetPassword.mutateAsync({ userId: resetting.id, newPassword })
      setResetting(null)
      resetForm.reset()
      toast.success(t('users.passwordReset'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  const columns: Column<User>[] = [
    { key: 'name', header: t('auth.fullName'), render: (user) => <span className="font-medium">{user.fullName}</span> },
    { key: 'email', header: t('auth.email'), render: (user) => <span className="text-ink-soft">{user.email}</span> },
    { key: 'role', header: t('profile.role'), render: (user) => <RoleBadge role={user.role} /> },
    { key: 'active', header: t('users.state'), render: (user) => <ActiveBadge active={user.active} /> },
    {
      key: 'created',
      header: t('common.createdAt'),
      render: (user) => <span className="text-ink-soft">{format(new Date(user.createdAt), 'yyyy-MM-dd')}</span>,
    },
    ...(canManage
      ? [
          {
            key: 'actions',
            header: <span className="sr-only">{t('common.actions')}</span>,
            className: 'w-32',
            render: (user: User) => (
              <div className="flex justify-end gap-1">
                <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => openEdit(user)}>
                  <Pencil className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t('users.resetPassword')}
                  onClick={() => {
                    resetForm.reset({ newPassword: '' })
                    setApiMessage(null)
                    setApiFields({})
                    setResetting(user)
                  }}
                >
                  <KeyRound className="size-4" />
                </Button>
                {user.active && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={t('users.deactivate')}
                    onClick={() => setDeactivating(user)}
                  >
                    <UserRoundX className="size-4 text-danger" />
                  </Button>
                )}
              </div>
            ),
          } satisfies Column<User>,
        ]
      : []),
  ]

  return (
    <div>
      <PageHeader
        title={t('nav.users')}
        actions={
          canManage && (
            <Button onClick={openCreate}>
              <Plus className="size-4" /> {t('users.create')}
            </Button>
          )
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters((f) => ({ ...f, search, page: 0 }))}
        />
        <select
          value={filters.role}
          onChange={(event) => setFilters((f) => ({ ...f, role: event.target.value, page: 0 }))}
          aria-label={t('profile.role')}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">{t('users.allRoles')}</option>
          {rolesQuery.data?.map((role) => (
            <option key={role.id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>
        <select
          value={filters.active}
          onChange={(event) => setFilters((f) => ({ ...f, active: event.target.value, page: 0 }))}
          aria-label={t('users.state')}
          className="h-9 rounded-lg border border-line bg-surface px-3 text-sm outline-none focus:border-primary"
        >
          <option value="">{t('common.all')}</option>
          <option value="true">{t('common.active')}</option>
          <option value="false">{t('common.inactive')}</option>
        </select>
      </div>

      <DataTable
        columns={columns}
        rows={usersQuery.data?.items ?? []}
        rowKey={(user) => user.id}
        loading={usersQuery.isLoading}
        emptyMessage={t('users.empty')}
      />
      <Pagination page={usersQuery.data} onPageChange={(page) => setFilters((f) => ({ ...f, page }))} />

      <Dialog
        open={creating || editing !== null}
        onClose={closeForm}
        title={editing ? t('users.edit') : t('users.create')}
      >
        <form onSubmit={submit} className="space-y-4">
          <TextField label={t('auth.fullName')} required error={apiFields.fullName} {...form.register('fullName')} />
          <TextField
            label={t('auth.email')}
            type="email"
            required
            disabled={editing !== null}
            error={apiFields.email}
            {...form.register('email')}
          />
          {!editing && (
            <>
              <fieldset>
                <legend className="mb-1.5 block text-sm font-medium">{t('users.credentialMode')}</legend>
                <div className="space-y-1.5 rounded-lg border border-line bg-paper p-3 text-sm">
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="credentialMode"
                      checked={inviteMode}
                      onChange={() => setInviteMode(true)}
                      className="mt-0.5 accent-(--color-primary)"
                    />
                    <span>
                      {t('users.inviteByEmail')}
                      <span className="block text-xs text-ink-soft">{t('users.inviteByEmailHint')}</span>
                    </span>
                  </label>
                  <label className="flex items-start gap-2">
                    <input
                      type="radio"
                      name="credentialMode"
                      checked={!inviteMode}
                      onChange={() => setInviteMode(false)}
                      className="mt-0.5 accent-(--color-primary)"
                    />
                    <span>
                      {t('users.setInitialPassword')}
                      <span className="block text-xs text-ink-soft">{t('users.setInitialPasswordHint')}</span>
                    </span>
                  </label>
                </div>
              </fieldset>
              {!inviteMode && (
                <TextField
                  label={t('users.initialPassword')}
                  type="password"
                  required
                  minLength={8}
                  error={apiFields.initialPassword}
                  {...form.register('initialPassword')}
                />
              )}
            </>
          )}
          <SelectField label={t('profile.role')} required error={apiFields.roleId} {...form.register('roleId')}>
            <option value="" disabled>
              {t('users.selectRole')}
            </option>
            {rolesQuery.data?.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </SelectField>
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createUser.isPending || updateUser.isPending}>
              {editing ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deactivating !== null}
        title={t('users.deactivate')}
        message={t('users.deactivateConfirm', { name: deactivating?.fullName })}
        confirmLabel={t('users.deactivate')}
        danger
        busy={deactivateUser.isPending}
        onConfirm={confirmDeactivate}
        onClose={() => setDeactivating(null)}
      />

      <Dialog
        open={resetting !== null}
        onClose={() => setResetting(null)}
        title={t('users.resetPasswordFor', { name: resetting?.fullName })}
      >
        <form onSubmit={submitReset} className="space-y-4">
          <TextField
            label={t('auth.newPassword')}
            type="password"
            required
            minLength={8}
            error={apiFields.newPassword}
            {...resetForm.register('newPassword')}
          />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setResetting(null)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={resetPassword.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  )
}
