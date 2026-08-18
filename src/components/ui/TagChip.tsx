import { cn } from '@/lib/utils'

/**
 * Colored tag chip (FR-27). The tag's hex color tints the background (~12%
 * alpha) and colors the label — readable on light and dark surfaces without
 * per-theme variants.
 */
export function TagChip({
  name,
  color,
  className,
}: {
  name: string
  color: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex max-w-32 items-center gap-1 truncate rounded-full px-2 py-0.5 text-xs font-medium',
        className,
      )}
      style={{ backgroundColor: `${color}1f`, color }}
      title={name}
    >
      <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} aria-hidden />
      {name}
    </span>
  )
}
