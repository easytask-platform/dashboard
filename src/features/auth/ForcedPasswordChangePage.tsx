import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { api } from '@/lib/api/client'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { PasswordField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

interface FormValues {
  newPassword: string
  confirmPassword: string
}

/**
 * Blocking screen when the current password is a temporary one (P3-2/D24):
 * invited users signed in with an emailed temp password, admins with one the
 * organization admin set. The user chooses their own password here — no code,
 * no re-entering the temp one (the login already proved it). Clearing the
 * mustChangePassword flag (via refreshUser) lets RequireAuth render the app.
 */
export function ForcedPasswordChangePage() {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useAuth()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<FormValues>()

  const onSubmit = handleSubmit(async ({ newPassword }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await api.post('/auth/first-login-password', { newPassword })
      await refreshUser()
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-white">
            <KeyRound className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.forcedChangeTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.forcedChangeSubtitle', { email: user?.email })}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-sm text-ink-soft">{t('auth.forcedChangeExplain')}</p>
          <PasswordField
            label={t('auth.newPassword')}
            autoComplete="new-password"
            required
            minLength={8}
            error={apiFields.newPassword}
            {...register('newPassword')}
          />
          <PasswordField
            label={t('auth.confirmPassword')}
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: (value) => value === watch('newPassword') || t('auth.passwordMismatch'),
            })}
          />
          <FormError message={apiMessage} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.resetAction')}
          </Button>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full text-center text-sm text-ink-soft hover:text-ink"
          >
            {t('auth.logout')}
          </button>
        </form>
      </div>
    </div>
  )
}
