import { createPortal } from 'react-dom'

interface DeleteDataModalProps {
  password: string
  onPasswordChange: (v: string) => void
  confirmText: string
  onConfirmTextChange: (v: string) => void
  error: string | null
  deleting: boolean
  onCancel: () => void
  onConfirm: () => void
}

export function DeleteDataModal({
  password,
  onPasswordChange,
  confirmText,
  onConfirmTextChange,
  error,
  deleting,
  onCancel,
  onConfirm,
}: DeleteDataModalProps) {
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onCancel}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Delete all your data?</h2>
        <p className="mt-2 text-sm text-slate-500">
          This permanently deletes every trip you've made and clears your profile. This can't be undone.
        </p>

        <div className="mt-4 space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Type DELETE to confirm</label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => onConfirmTextChange(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-[50px] border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Confirm your password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              autoComplete="current-password"
              className="w-full rounded-[50px] border border-slate-300 px-4 py-2.5 text-sm outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400"
            />
          </div>
        </div>

        {error && <p role="alert" className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={deleting}
            className="flex-1 appearance-none rounded-[50px] bg-red-600 px-5 py-3 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {deleting ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
