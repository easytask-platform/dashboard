import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { api } from '@/lib/api/client'
import { tokenStore } from '@/lib/api/token-store'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { TextField, PasswordField, FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'
import type { LoginResponse } from '@/lib/api/types'

interface RegisterForm {
  organizationName: string
  adminFullName: string
  email: string
  password: string
  confirmPassword: string
}

export function RegisterOrganizationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { refreshUser } = useAuth()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [apiFields, setApiFields] = useState<Record<string, string>>({})
  const {
    register,
    handleSubmit,
    watch,
    formState: { isSubmitting, errors },
  } = useForm<RegisterForm>()

  const onSubmit = handleSubmit(async ({ organizationName, adminFullName, email, password }) => {
    setApiMessage(null)
    setApiFields({})
    try {
      const { data } = await api.post<LoginResponse>('/auth/register-organization', {
        organizationName,
        adminFullName,
        email,
        password,
      })
      tokenStore.set(data.accessToken, data.refreshToken)
      await refreshUser()
      navigate('/', { replace: true })
    } catch (error) {
      const split = splitApiError(error)
      setApiMessage(split.message)
      setApiFields(split.fields)
    }
  })

  return (
    <div className="grid min-h-screen place-items-center bg-paper p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src="/logo.png" alt="" className="mx-auto mb-4 size-14" />
          <h1 className="text-2xl font-semibold tracking-tight">{t('auth.registerTitle')}</h1>
          <p className="mt-1 text-sm text-ink-soft">{t('auth.registerSubtitle')}</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <TextField
            label={t('auth.organizationName')}
            required
            error={apiFields.organizationName}
            {...register('organizationName')}
          />
          <TextField
            label={t('auth.adminFullName')}
            required
            error={apiFields.adminFullName}
            {...register('adminFullName')}
          />
          <TextField
            label={t('auth.email')}
            type="email"
            autoComplete="email"
            required
            error={apiFields.email}
            {...register('email')}
          />
          <PasswordField
            label={t('auth.password')}
            autoComplete="new-password"
            required
            minLength={8}
            error={apiFields.password}
            {...register('password')}
          />
          <PasswordField
            label={t('auth.confirmPassword')}
            autoComplete="new-password"
            required
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: (value) => value === watch('password') || t('auth.passwordMismatch'),
            })}
          />
          <FormError message={apiMessage} />
          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? t('common.loading') : t('auth.register')}
          </Button>
          <p className="text-center text-sm text-ink-soft">
            {t('auth.haveAccount')}{' '}
            <Link to="/login" className="font-medium text-primary hover:underline">
              {t('auth.login')}
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
