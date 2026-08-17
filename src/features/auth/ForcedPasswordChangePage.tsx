import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTranslation } from 'react-i18next'
import { KeyRound } from 'lucide-react'
import { splitApiError } from '@/lib/api/form-errors'
import { useAuth } from './auth-context'
import { resetFlow } from './reset-flow'
import { FormError } from '@/components/ui/Field'
import { Button } from '@/components/ui/Button'

/**
 * Blocking screen when the current password was chosen by an admin
 * (P3-2/D24). Same code-based flow as everywhere else: one click emails a
 * code to the account, then code page → new password page.
 */
export function ForcedPasswordChangePage() {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [apiMessage, setApiMessage] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  const sendCode = async () => {
    if (!user) return
    setSending(true)
    setApiMessage(null)
    try {
      await resetFlow.start(user.email)
      navigate('/reset-code')
    } catch (error) {
      setApiMessage(splitApiError(error).message)
    } finally {
      setSending(false)
    }
  }

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

        <div className="space-y-4 rounded-card border border-line bg-surface p-6 shadow-card">
          <p className="text-sm text-ink-soft">{t('auth.forcedChangeExplain')}</p>
          <FormError message={apiMessage} />
          <Button onClick={() => void sendCode()} disabled={sending} className="w-full">
            {sending ? t('common.loading') : t('auth.emailMeCode')}
          </Button>
          <button
            type="button"
            onClick={() => void logout()}
            className="w-full text-center text-sm text-ink-soft hover:text-ink"
          >
            {t('auth.logout')}
          </button>
        </div>
      </div>
    </div>
  )
}
