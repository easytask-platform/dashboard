import type { InputHTMLAttributes, SelectHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react'
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
