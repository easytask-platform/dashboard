import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { MailCheck } from 'lucide-react'
import { splitApiError } from '@/lib/api/form-errors'
import { ApiError } from '@/lib/api/types'
import { resetFlow } from './reset-flow'
import { TextField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

/**
 * Step 1 of the code-based flow, for logged-OUT users only: they must tell
 * us which account. (Logged-in users skip this page entirely — the code is
 * sent straight to their own email.) Unknown emails are told so plainly.
 */
export function ForgotPasswordPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [emailError, setEmailError] = useState<string | undefined>(undefined)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ email: string }>()

  const submit = handleSubmit(async ({ email }) => {
    setApiMessage(null)
    setEmailError(undefined)
    try {
      await resetFlow.start(email.trim())
      navigate('/reset-code')
    } catch (error) {
      if (error instanceof ApiError && error.status === 404) {
        setEmailError(t('auth.noAccount404'))
      } else {
        setApiMessage(splitApiError(error).message)
      }
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
          <p className="mt-1 text-sm text-ink-soft">{t('auth.forgotSubtitle')}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            error={emailError}
            {...register('email')}
          />
          <FormError message={apiMessage} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.sendCode')}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('auth.backToLogin')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
