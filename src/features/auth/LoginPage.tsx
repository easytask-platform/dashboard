import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { useAuth } from './auth-context'
import { ApiError } from '@/lib/api/types'
import { PasswordField } from '@/components/ui/Field'
import { enablePush } from '@/lib/push/push'

interface LoginForm {
  email: string
  password: string
}

export function LoginPage() {
  const { t } = useTranslation()
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginForm>()

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setApiMessage(null)
    try {
      await login(email, password)
      // Ask for notification permission now, while we still have the click's
      // user gesture — browsers suppress the prompt on a bare page load.
      void enablePush()
      const from = (location.state as { from?: string } | null)?.from
      navigate(from ?? '/', { replace: true })
    } catch (error) {
      setApiMessage(error instanceof ApiError ? error.message : 'Something went wrong')
    }
  })

  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="" className="mx-auto mb-4 size-14" />
          <h1 className="text-2xl font-semibold tracking-tight">{t('app.name')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('app.tagline')}</p>
        </div>

        <form
          onSubmit={onSubmit}
          className="rounded-card border border-line bg-surface p-6 shadow-card"
        >
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium">{t('auth.email')}</span>
            <input
              type="email"
              autoComplete="email"
              required
              {...register('email')}
              className="w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-primary"
            />
          </label>
          <PasswordField
            label={t('auth.password')}
            autoComplete="current-password"
            required
            containerClassName="mb-6"
            {...register('password')}
          />

          <p className="mb-6 -mt-2 text-end">
            <Link to="/forgot-password" className="text-sm font-medium text-primary hover:underline">
              {t('auth.forgotLink')}
            </Link>
          </p>

          {apiMessage && (
            <p role="alert" className="mb-4 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
              {apiMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-lg bg-primary py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-deep disabled:opacity-60"
          >
            {isSubmitting ? t('common.loading') : t('auth.login')}
          </button>

          <p className="mt-4 text-center text-sm text-ink-soft">
            {t('auth.noAccount')}{' '}
            <Link to="/register" className="font-medium text-primary hover:underline">
              {t('auth.register')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
