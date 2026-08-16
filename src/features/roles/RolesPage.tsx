import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock, Pencil, Plus, Trash2 } from 'lucide-react'
import {
  useRolesQuery,
  usePermissionsQuery,
  useCreateRole,
  useUpdateRole,
  useDeleteRole,
  groupPermissions,
  type DataScope,
  type Role,
} from './api'
import { splitApiError } from '@/lib/api/form-errors'
import { PageHeader } from '@/components/ui/PageHeader'
import { DataTable, type Column } from '@/components/ui/DataTable'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { TextField, SelectField, FormError, FieldWrapper } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'

const SCOPES: DataScope[] = ['ORGANIZATION', 'MANAGED', 'ASSIGNED']

interface RoleDraft {
  name: string
  dataScope: DataScope
  permissions: Set<string>
}

export function RolesPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const rolesQuery = useRolesQuery()
  const permissionsQuery = usePermissionsQuery()
  const createRole = useCreateRole()
  const updateRole = useUpdateRole()
  const deleteRole = useDeleteRole()

  const [editing, setEditing] = useState<Role | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Role | null>(null)
  const [draft, setDraft] = useState<RoleDraft>({ name: '', dataScope: 'MANAGED', permissions: new Set() })
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})

  const openCreate = () => {
    setDraft({ name: '', dataScope: 'MANAGED', permissions: new Set() })
    setApiMessage(null)
    setApiFields({})
    setCreating(true)
  }

  const openEdit = (role: Role) => {
    setDraft({ name: role.name, dataScope: role.dataScope, permissions: new Set(role.permissions) })
    setApiMessage(null)
    setApiFields({})
    setEditing(role)
  }

  const closeForm = () => {
    setCreating(false)
    setEditing(null)
  }

  const togglePermission = (code: string) => {
    setDraft((current) => {
      const permissions = new Set(current.permissions)
      if (permissions.has(code)) permissions.delete(code)
      else permissions.add(code)
      return { ...current, permissions }
    })
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setApiMessage(null)
    setApiFields({})
    const body = { name: draft.name, dataScope: draft.dataScope, permissions: [...draft.permissions] }
    if (body.permissions.length === 0) {
      setApiMessage(t('roles.needPermission'))
      return
    }
    try {
      if (editing) await updateRole.mutateAsync({ roleId: editing.id, ...body })
      else await createRole.mutateAsync(body)
      closeForm()
      toast.success(t('common.save'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await deleteRole.mutateAsync(deleting.id)
      toast.success(t('roles.deleted'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setDeleting(null)
    }
  }

  const columns: Column<Role>[] = [
    {
      key: 'name',
      header: t('common.name'),
      render: (role) => (
        <span className="flex items-center gap-2 font-medium">
          {role.name}
          {role.system && <Lock className="size-3.5 text-ink-soft" aria-label={t('roles.system')} />}
        </span>
      ),
    },
    {
      key: 'scope',
      header: t('roles.scope'),
      render: (role) => <Badge label={t(`roles.scopes.${role.dataScope}`)} color="var(--color-primary)" />,
    },
    {
      key: 'permissions',
      header: t('nav.roles'),
      render: (role) => (
        <span className="text-ink-soft">{t('roles.permissionCount', { count: role.permissions.length })}</span>
      ),
    },
    { key: 'users', header: t('nav.users'), render: (role) => <span>{role.userCount}</span> },
    {
      key: 'actions',
      header: <span className="sr-only">{t('common.actions')}</span>,
      className: 'w-24',
      render: (role) =>
        role.system ? null : (
          <div className="flex justify-end gap-1">
            <Button variant="ghost" size="icon" aria-label={t('common.edit')} onClick={() => openEdit(role)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon" aria-label={t('common.delete')} onClick={() => setDeleting(role)}>
              <Trash2 className="size-4 text-danger" />
            </Button>
          </div>
        ),
    },
  ]

  const grouped = groupPermissions(permissionsQuery.data ?? [])

  return (
    <div>
      <PageHeader
        title={t('nav.roles')}
        actions={
          <Button onClick={openCreate}>
            <Plus className="size-4" /> {t('roles.create')}
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rolesQuery.data ?? []}
        rowKey={(role) => role.id}
        loading={rolesQuery.isLoading}
      />

      <Dialog
        open={creating || editing !== null}
        onClose={closeForm}
        title={editing ? t('roles.edit') : t('roles.create')}
        wide
      >
        <form onSubmit={submit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label={t('common.name')}
              required
              value={draft.name}
              error={apiFields.name}
              onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
            />
            <SelectField
              label={t('roles.scope')}
              value={draft.dataScope}
              error={apiFields.dataScope}
              onChange={(event) =>
                setDraft((current) => ({ ...current, dataScope: event.target.value as DataScope }))
              }
            >
              {SCOPES.map((scope) => (
                <option key={scope} value={scope}>
                  {t(`roles.scopes.${scope}`)}
                </option>
              ))}
            </SelectField>
          </div>

          <FieldWrapper label={t('roles.permissions')} error={apiFields.permissions}>
            <div className="max-h-72 space-y-4 overflow-y-auto rounded-lg border border-line bg-paper p-4">
              {[...grouped.entries()].map(([module, permissions]) => (
                <fieldset key={module}>
                  <legend className="mb-1.5 text-xs font-semibold tracking-wide text-ink-soft uppercase">
                    {module}
                  </legend>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {permissions.map((permission) => (
                      <label key={permission.code} className="flex items-start gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={draft.permissions.has(permission.code)}
                          onChange={() => togglePermission(permission.code)}
                          className="mt-0.5 accent-(--color-primary)"
                        />
                        <span>
                          <code className="text-xs">{permission.code}</code>
                          <span className="block text-xs text-ink-soft">{permission.description}</span>
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
            </div>
          </FieldWrapper>

          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={closeForm}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={createRole.isPending || updateRole.isPending}>
              {editing ? t('common.save') : t('common.create')}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        title={t('roles.delete')}
        message={t('roles.deleteConfirm', { name: deleting?.name })}
        confirmLabel={t('common.delete')}
        danger
        busy={deleteRole.isPending}
        onConfirm={confirmDelete}
        onClose={() => setDeleting(null)}
      />
    </div>
  )
}
