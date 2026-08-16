import { ApiError } from './types'

/**
 * Splits a caught error into a general message + per-field messages so forms
 * can show contract `fields` errors next to their inputs.
 */
export function splitApiError(error: unknown): {
  message: string | null
  fields: Record<string, string>
} {
  if (error instanceof ApiError) {
    const hasFields = Object.keys(error.fields).length > 0
    return { message: hasFields ? null : error.message, fields: error.fields }
  }
  return { message: 'Something went wrong', fields: {} }
}
