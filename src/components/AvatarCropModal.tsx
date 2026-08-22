import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

const VIEWPORT_SIZE = 260
const OUTPUT_SIZE = 480

interface AvatarCropModalProps {
  file: File
  onCancel: () => void
  onConfirm: (blob: Blob) => void
}

export function AvatarCropModal({ file, onCancel, onConfirm }: AvatarCropModalProps) {
  const [imageEl, setImageEl] = useState<HTMLImageElement | null>(null)
  const [zoom, setZoom] = useState(1)
  const [tilt, setTilt] = useState(0)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const dragState = useRef<{ startX: number; startY: number; origin: { x: number; y: number } } | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => setImageEl(img)
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  const baseScale = imageEl ? VIEWPORT_SIZE / Math.min(imageEl.width, imageEl.height) : 1
  const drawScale = baseScale * zoom

  function handlePointerDown(e: React.PointerEvent) {
    ;(e.target as Element).setPointerCapture(e.pointerId)
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset }
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current) return
    const dx = e.clientX - dragState.current.startX
    const dy = e.clientY - dragState.current.startY
    setOffset({ x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy })
  }

  function handlePointerUp() {
    dragState.current = null
  }

  function handleConfirm() {
    if (!imageEl) return
    const canvas = document.createElement('canvas')
    canvas.width = OUTPUT_SIZE
    canvas.height = OUTPUT_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const outputScale = OUTPUT_SIZE / VIEWPORT_SIZE
    ctx.fillStyle = '#f1f5f9'
    ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
    ctx.save()
    ctx.scale(outputScale, outputScale)
    ctx.translate(VIEWPORT_SIZE / 2, VIEWPORT_SIZE / 2)
    ctx.rotate((tilt * Math.PI) / 180)
    ctx.translate(offset.x, offset.y)
    ctx.drawImage(
      imageEl,
      (-imageEl.width * drawScale) / 2,
      (-imageEl.height * drawScale) / 2,
      imageEl.width * drawScale,
      imageEl.height * drawScale,
    )
    ctx.restore()

    canvas.toBlob(
      (blob) => {
        if (blob) onConfirm(blob)
      },
      'image/jpeg',
      0.92,
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-center text-base font-semibold text-slate-900">Adjust photo</h2>

        <div
          ref={viewportRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative mx-auto mt-5 overflow-hidden rounded-full bg-slate-900 shadow-inner"
          style={{ width: VIEWPORT_SIZE, height: VIEWPORT_SIZE, cursor: 'grab', touchAction: 'none' }}
        >
          {imageEl && (
            <img
              src={imageEl.src}
              alt="Crop preview"
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                width: imageEl.width * drawScale,
                height: imageEl.height * drawScale,
                left: VIEWPORT_SIZE / 2 - (imageEl.width * drawScale) / 2 + offset.x,
                top: VIEWPORT_SIZE / 2 - (imageEl.height * drawScale) / 2 + offset.y,
                transform: `rotate(${tilt}deg)`,
                transformOrigin: 'center',
              }}
            />
          )}
          <div className="pointer-events-none absolute inset-0 rounded-full ring-2 ring-inset ring-white/60" />
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1 flex justify-between text-xs font-medium text-slate-500">
              <span>Zoom</span>
            </label>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
          <div>
            <label className="mb-1 flex justify-between text-xs font-medium text-slate-500">
              <span>Tilt</span>
            </label>
            <input
              type="range"
              min={-45}
              max={45}
              step={1}
              value={tilt}
              onChange={(e) => setTilt(Number(e.target.value))}
              className="w-full accent-slate-900"
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!imageEl}
            className="flex-1 appearance-none rounded-[50px] bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-700 disabled:opacity-60"
          >
            Set photo
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
