import { useLayoutEffect, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'

interface DropdownPortalProps {
  anchorRef: RefObject<HTMLElement | null>
  children: ReactNode
}

// Renders its children into document.body, positioned under the anchor
// element using viewport coordinates. Escapes any stacking-context trap
// (e.g. an `isolate` ancestor) that would otherwise bury the dropdown
// under later-DOM-order siblings regardless of z-index.
export function DropdownPortal({ anchorRef, children }: DropdownPortalProps) {
  const [style, setStyle] = useState<{ top: number; left: number; minWidth: number } | null>(null)

  useLayoutEffect(() => {
    if (!anchorRef.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const margin = 8
    // Clamp so the dropdown never renders past the right edge of a narrow
    // (phone-width) viewport — without this, a dropdown wider than the
    // remaining space to the anchor's right would run off-screen.
    const left = Math.min(rect.left + window.scrollX, window.innerWidth + window.scrollX - rect.width - margin)
    setStyle({
      top: rect.bottom + window.scrollY + 8,
      left: Math.max(left, margin),
      minWidth: rect.width,
    })
  }, [anchorRef])

  if (!style) return null

  return createPortal(
    <div className="absolute z-[100]" style={{ top: style.top, left: style.left, minWidth: style.minWidth }}>
      {children}
    </div>,
    document.body,
  )
}
