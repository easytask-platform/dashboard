import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { api } from '@/lib/api/client'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { TextField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

interface ForcedPasswordForm {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * Blocking screen shown when the current password was chosen by an admin
 * (P3-2/D24): nothing else is reachable until the user picks their own.
 */
export function ForcedPasswordChangePage() {
  const { t } = useTranslation()
  const { user, login, logout } = useAuth()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<ForcedPasswordForm>()

  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await api.patch('/me/password', { currentPassword, newPassword })
      // The change revoked every session server-side — log back in with the
      // new password for fresh tokens and the cleared flag.
      await login(user!.email, newPassword)
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

        <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
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
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.forcedChangeAction')}
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
