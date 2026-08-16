import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api/client'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { Button } from '@/components/ui/Button'
import { Dialog, ConfirmDialog } from '@/components/ui/Dialog'
import { TextField, FormError } from '@/components/ui/Field'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

interface PasswordForm {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { isSubmitting, errors },
  } = useForm<PasswordForm>()

  const submitPassword = handleSubmit(async ({ currentPassword, newPassword }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await api.patch('/me/password', { currentPassword, newPassword })
      setPasswordOpen(false)
      reset()
      toast.success(t('auth.passwordChanged'))
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  const confirmLogout = async () => {
    setLoggingOut(true)
    await logout()
    navigate('/login', { replace: true })
  }

  if (!user) return null

  const rows: Array<[string, React.ReactNode]> = [
    [t('auth.fullName'), user.fullName],
    [t('auth.email'), user.email],
    [t('profile.role'), <RoleBadge key="role" role={user.role} />],
    [t('profile.organization'), user.organizationName],
  ]

  return (
    <div className="max-w-xl">
      <PageHeader title={t('nav.profile')} />
      <div className="rounded-card border border-line bg-surface p-6 shadow-card">
        <dl className="space-y-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex gap-2 border-t border-line pt-6">
          <Button variant="secondary" onClick={() => setPasswordOpen(true)}>
            {t('auth.changePassword')}
          </Button>
          <Button variant="danger" onClick={() => setLogoutOpen(true)}>
            {t('auth.logout')}
          </Button>
        </div>
      </div>

      <Dialog open={passwordOpen} onClose={() => setPasswordOpen(false)} title={t('auth.changePassword')}>
        <form onSubmit={submitPassword} className="space-y-4">
          <TextField
            label={t('auth.currentPassword')}
            type="password"
            autoComplete="current-password"
            required
            error={apiFields.currentPassword}
            {...register('currentPassword')}
          />
          <TextField
            label={t('auth.newPassword')}
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
            error={apiFields.newPassword}
            {...register('newPassword')}
          />
          <TextField
            label={t('auth.confirmPassword')}
            type="password"
            autoComplete="new-password"
            required
            error={errors.confirmNewPassword?.message}
            {...register('confirmNewPassword', {
              validate: (value) => value === watch('newPassword') || t('auth.passwordMismatch'),
            })}
          />
          <FormError message={apiMessage} />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setPasswordOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </Dialog>

      <ConfirmDialog
        open={logoutOpen}
        title={t('auth.logout')}
        message={t('auth.logoutConfirm')}
        confirmLabel={t('auth.logout')}
        danger
        busy={loggingOut}
        onConfirm={confirmLogout}
        onClose={() => setLogoutOpen(false)}
      />
    </div>
  )
}
