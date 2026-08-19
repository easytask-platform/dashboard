import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

const inputClass =
  'w-full rounded-lg border border-line bg-paper px-3 py-2 text-sm outline-none transition-colors focus:border-primary disabled:opacity-60'

interface FieldWrapperProps {
  label: string
  /** Server-side field error from ApiError.fields, or client validation message. */
  error?: string
  children: ReactNode
  className?: string
}

export function FieldWrapper({ label, error, children, className }: FieldWrapperProps) {
  return (
    <label className={cn('block', className)}>
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {error && (
        <span role="alert" className="mt-1 block text-xs text-danger">
          {error}
        </span>
      )}
    </label>
  )
}

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  containerClassName?: string
}

export function TextField({ label, error, containerClassName, className, ...props }: TextFieldProps) {
  return (
    <FieldWrapper label={label} error={error} className={containerClassName}>
      <input className={cn(inputClass, error && 'border-danger', className)} {...props} />
    </FieldWrapper>
  )
}

/**
 * Password input with a show/hide toggle. Same API as TextField; forces
 * type=password and layers an eye button on the trailing (RTL-aware) edge.
 */
export function PasswordField({ label, error, containerClassName, className, ...props }: TextFieldProps) {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(false)
  return (
    <FieldWrapper label={label} error={error} className={containerClassName}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          className={cn(inputClass, 'pe-10', error && 'border-danger', className)}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
          className="absolute inset-y-0 end-0 grid w-10 place-items-center rounded-e-lg text-ink-soft outline-none hover:text-ink focus-visible:text-ink"
        >
          {visible ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </FieldWrapper>
  )
}

interface TextAreaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  containerClassName?: string
}

export function TextAreaField({ label, error, containerClassName, className, ...props }: TextAreaFieldProps) {
  return (
    <FieldWrapper label={label} error={error} className={containerClassName}>
      <textarea rows={3} className={cn(inputClass, 'resize-y', error && 'border-danger', className)} {...props} />
    </FieldWrapper>
  )
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  containerClassName?: string
}

export function SelectField({ label, error, containerClassName, className, children, ...props }: SelectFieldProps) {
  return (
    <FieldWrapper label={label} error={error} className={containerClassName}>
      <select className={cn(inputClass, 'bg-surface', error && 'border-danger', className)} {...props}>
        {children}
      </select>
    </FieldWrapper>
  )
}

/** Inline error banner for non-field API errors. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger">
      {message}
    </p>
  )
}
