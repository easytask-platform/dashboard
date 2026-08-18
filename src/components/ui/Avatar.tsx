import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api/client'
import { cn } from '@/lib/utils'

export interface AvatarPerson {
  id: string
  fullName: string
  avatarUrl?: string | null
}

const SIZE_CLASSES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-7 text-[11px]',
  md: 'size-9 text-sm',
  lg: 'size-20 text-2xl',
} as const

/** Deterministic per-name background for the initials fallback (mirrors the Flutter app). */
const FALLBACK_CLASSES = [
  'bg-primary-soft text-primary-deep',
  'bg-status-progress/15 text-status-progress',
  'bg-status-review/15 text-status-review',
  'bg-status-approved/15 text-status-approved',
  'bg-priority-critical/15 text-priority-critical',
  'bg-status-reopened/15 text-status-reopened',
]

function initials(fullName: string): string {
  const parts = fullName.trim().split(/\s+/)
  const first = parts[0]?.[0] ?? '?'
  const second = parts.length > 1 ? (parts[parts.length - 1][0] ?? '') : ''
  return (first + second).toUpperCase()
}

function fallbackClass(fullName: string): string {
  let hash = 0
  for (const char of fullName) hash = (hash * 31 + char.codePointAt(0)!) >>> 0
  return FALLBACK_CLASSES[hash % FALLBACK_CLASSES.length]
}

/**
 * Avatar images require the bearer token, so a plain <img src> cannot load
 * them: the picture is fetched as a blob and shown via an object URL. The
 * avatarUrl carries a cache-busting v= param, so caching per URL is safe
 * for the whole session.
 */
export function Avatar({
  person,
  size = 'sm',
  className,
}: {
  person: AvatarPerson
  size?: keyof typeof SIZE_CLASSES
  className?: string
}) {
  const { data: src } = useQuery({
    queryKey: ['avatar', person.avatarUrl],
    enabled: !!person.avatarUrl,
    staleTime: Infinity,
    gcTime: Infinity,
    queryFn: async () => {
      // avatarUrl is API-relative ("/api/v1/…"); the axios base already ends in /api/v1.
      const path = person.avatarUrl!.replace(/^\/api\/v1/, '')
      const { data } = await api.get<Blob>(path, { responseType: 'blob' })
      return URL.createObjectURL(data)
    },
  })

  if (person.avatarUrl && src) {
    return (
      <img
        src={src}
        alt=""
        aria-hidden
        className={cn('shrink-0 rounded-full object-cover', SIZE_CLASSES[size], className)}
      />
    )
  }
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-full font-semibold',
        SIZE_CLASSES[size],
        fallbackClass(person.fullName),
        className,
      )}
    >
      {initials(person.fullName)}
    </span>
  )
}
