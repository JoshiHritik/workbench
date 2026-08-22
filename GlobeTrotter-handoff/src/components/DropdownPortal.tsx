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
    setStyle({
      top: rect.bottom + window.scrollY + 8,
      left: rect.left + window.scrollX,
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
