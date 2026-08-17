import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { MailCheck } from 'lucide-react'
import { api } from '@/lib/api/client'
import { splitApiError } from '@/lib/api/form-errors'
import { TextField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

interface RequestForm {
  email: string
}

interface ResetForm {
  token: string
  newPassword: string
  confirmPassword: string
}

/**
 * Forgot-password (code by email). Step 1 requests the code; step 2 redeems
 * it with a new password. The same screen accepts invitation codes.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState<'request' | 'reset'>('request')
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})

  const requestForm = useForm<RequestForm>()
  const resetForm = useForm<ResetForm>()

  const submitRequest = requestForm.handleSubmit(async ({ email }) => {
    setApiMessage(null)
    try {
      await api.post('/auth/forgot-password', { email })
      setStep('reset')
    } catch (error) {
      setApiMessage(splitApiError(error).message)
    }
  })

  const submitReset = resetForm.handleSubmit(async ({ token, newPassword }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      await api.post('/auth/reset-password', { token: token.trim(), newPassword })
      toast.success(t('auth.resetDone'))
      navigate('/login', { replace: true })
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
            <MailCheck className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.forgotTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">
            {step === 'request' ? t('auth.forgotSubtitle') : t('auth.resetSubtitle')}
          </p>
        </div>

        {step === 'request' ? (
          <form
            key="request"
            onSubmit={submitRequest}
            className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card"
          >
            <TextField
              label={t('auth.email')}
              type="email"
              autoComplete="email"
              required
              {...requestForm.register('email')}
            />
            <FormError message={apiMessage} />
            <Button type="submit" disabled={requestForm.formState.isSubmitting} className="w-full">
              {t('auth.sendCode')}
            </Button>
            <p className="text-center text-sm text-ink-soft">
              <Link to="/login" className="font-medium text-primary hover:underline">
                {t('auth.backToLogin')}
              </Link>
            </p>
          </form>
        ) : (
          <form
            key="reset"
            onSubmit={submitReset}
            className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card"
          >
            <TextField
              label={t('auth.code')}
              required
              autoComplete="one-time-code"
              error={apiFields.token}
              {...resetForm.register('token')}
            />
            <TextField
              label={t('auth.newPassword')}
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              error={apiFields.newPassword}
              {...resetForm.register('newPassword')}
            />
            <TextField
              label={t('auth.confirmPassword')}
              type="password"
              autoComplete="new-password"
              required
              error={resetForm.formState.errors.confirmPassword?.message}
              {...resetForm.register('confirmPassword', {
                validate: (value) => value === resetForm.watch('newPassword') || t('auth.passwordMismatch'),
              })}
            />
            <FormError message={apiMessage} />
            <Button type="submit" disabled={resetForm.formState.isSubmitting} className="w-full">
              {t('auth.resetAction')}
            </Button>
            <button
              type="button"
              onClick={() => setStep('request')}
              className="w-full text-center text-sm text-ink-soft hover:text-ink"
            >
              {t('auth.resendCode')}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
