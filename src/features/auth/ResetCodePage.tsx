import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { ShieldCheck } from 'lucide-react'
import { splitApiError } from '@/lib/api/form-errors'
import { ApiError } from '@/lib/api/types'
import { resetFlow } from './reset-flow'
import { TextField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'

/** Step 2: just the code, nothing else. Verified before moving on. */
export function ResetCodePage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const toast = useToast()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [codeError, setCodeError] = useState<string | undefined>(undefined)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ code: string }>()

  const email = resetFlow.email
  if (!email) return <Navigate to="/forgot-password" replace />

  const submit = handleSubmit(async ({ code }) => {
    setApiMessage(null)
    setCodeError(undefined)
    try {
      await resetFlow.verify(code.trim())
      navigate('/reset-password')
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setCodeError(t('auth.badCode'))
      } else {
        setApiMessage(splitApiError(error).message)
      }
    }
  })

  const resend = async () => {
    try {
      await resetFlow.start(email)
      toast.success(t('auth.codeResent'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    }
  }

  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-white">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.codeTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.codeSentTo', { email })}</p>
        </div>

        <form onSubmit={submit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <TextField
            label={t('auth.code')}
            required
            autoComplete="one-time-code"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            title={t('auth.codeFormat')}
            className="text-center text-2xl font-semibold tracking-[0.5em]"
            error={codeError}
            {...register('code')}
          />
          <FormError message={apiMessage} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.verifyCode')}
          </Button>
          <button
            type="button"
            onClick={() => void resend()}
            className="w-full text-center text-sm text-primary hover:underline"
          >
            {t('auth.resendCode')}
          </button>
        </form>
      </div>
    </div>
  )
}
