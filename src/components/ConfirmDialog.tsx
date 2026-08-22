import { createPortal } from 'react-dom'

interface ConfirmDialogProps {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-2 text-sm text-slate-500">{message}</p>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 appearance-none rounded-[50px] px-5 py-3 text-sm font-medium text-white transition ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-slate-900 hover:bg-slate-700'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
