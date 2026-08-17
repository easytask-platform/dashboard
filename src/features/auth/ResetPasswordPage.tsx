import { useState } from 'react'
import { Navigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { splitApiError } from '@/lib/api/form-errors'
import { resetFlow } from './reset-flow'
import { tokenStore } from '@/lib/api/token-store'
import { TextField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface PasswordForm {
  newPassword: string
  confirmPassword: string
}

/** Step 3: only the new password — the code was already verified. */
export function ResetPasswordPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<PasswordForm>()

  if (!resetFlow.code) return <Navigate to="/forgot-password" replace />

  const submit = handleSubmit(async ({ newPassword }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await resetFlow.complete(newPassword)
      // The reset revoked every session server-side; drop any local one too.
      tokenStore.clear()
      toast.success(t('auth.resetDone'))
      window.location.href = '/login'
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
          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.newPasswordTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.newPasswordSubtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
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
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: (value) => value === watch('newPassword') || t('auth.passwordMismatch'),
            })}
          />
          <FormError message={apiMessage} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.resetAction')}
          </Button>
        </form>
      </div>
    </div>
  )
}
