import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { api } from '@/lib/api/client'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { resetFlow } from './reset-flow'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import { ConfirmDialog } from '@/components/ui/Dialog'
import { PageHeader } from '@/components/ui/PageHeader'
import { RoleBadge } from '@/components/ui/Badge'
import { useToast } from '@/components/ui/Toast'

export function ProfilePage() {
  const { t } = useTranslation()
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()
  const toast = useToast()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [loggingOut, setLoggingOut] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [avatarBusy, setAvatarBusy] = useState(false)
  const avatarInput = useRef<HTMLInputElement>(null)

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setAvatarBusy(true)
    try {
      const form = new FormData()
      form.append('file', file)
      await api.put('/me/avatar', form)
      await refreshUser()
      toast.success(t('profile.photoUpdated'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setAvatarBusy(false)
    }
  }

  const removeAvatar = async () => {
    setAvatarBusy(true)
    try {
      await api.delete('/me/avatar')
      await refreshUser()
      toast.success(t('profile.photoRemoved'))
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setAvatarBusy(false)
    }
  }

  /**
   * Code-based change (P3 UX): we know who is logged in, so the code goes
   * straight to their email — no forms, no current password.
   */
  const startPasswordChange = async () => {
    if (!user) return
    setSendingCode(true)
    try {
      await resetFlow.start(user.email)
      toast.success(t('auth.codeSentToast', { email: user.email }))
      navigate('/reset-code')
    } catch (error) {
      toast.error(splitApiError(error).message ?? t('common.error'))
    } finally {
      setSendingCode(false)
    }
  }

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
        <div className="mb-6 flex items-center gap-4 border-b border-line pb-6">
          <Avatar person={user} size="lg" />
          <div className="flex flex-col items-start gap-2">
            <input
              ref={avatarInput}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              hidden
              onChange={(event) => void uploadAvatar(event)}
              aria-label={t('profile.changePhoto')}
            />
            <Button variant="secondary" size="sm" disabled={avatarBusy} onClick={() => avatarInput.current?.click()}>
              {avatarBusy ? t('common.loading') : t('profile.changePhoto')}
            </Button>
            {user.avatarUrl && (
              <Button variant="ghost" size="sm" disabled={avatarBusy} onClick={() => void removeAvatar()}>
                {t('profile.removePhoto')}
              </Button>
            )}
            <p className="text-xs text-ink-soft">{t('profile.photoHint')}</p>
          </div>
        </div>
        <dl className="space-y-4">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4">
              <dt className="text-sm text-ink-soft">{label}</dt>
              <dd className="text-sm font-medium">{value}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line pt-6">
          <Button variant="secondary" onClick={() => void startPasswordChange()} disabled={sendingCode}>
            {sendingCode ? t('common.loading') : t('auth.changePassword')}
          </Button>
          <Button variant="danger" onClick={() => setLogoutOpen(true)}>
            {t('auth.logout')}
          </Button>
          <p className="w-full text-xs text-ink-soft">{t('auth.changePasswordHint')}</p>
        </div>
      </div>

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
