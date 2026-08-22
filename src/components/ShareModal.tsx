import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'

interface ShareModalProps {
  url: string
  slug: string
  onClose: () => void
}

export function ShareModal({ url, slug, onClose }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="text-base font-semibold text-slate-900">Share this trip</h2>
        <p className="mt-1 text-sm text-slate-500">Anyone with this link can view the itinerary.</p>

        <div className="mt-4 flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 py-2 pl-4 pr-2">
          <input readOnly value={url} className="min-w-0 flex-1 truncate bg-transparent text-xs text-slate-600 outline-none" />
          <button
            type="button"
            onClick={handleCopy}
            className="flex-shrink-0 rounded-full bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 appearance-none rounded-[50px] border border-slate-300 px-5 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
          <Link
            to={`/shared/${slug}`}
            target="_blank"
            rel="noreferrer"
            onClick={onClose}
            className="flex-1 appearance-none rounded-[50px] bg-slate-900 px-5 py-3 text-center text-sm font-medium text-white transition hover:bg-slate-700"
          >
            View itinerary
          </Link>
        </div>
      </div>
    </div>,
    document.body,
  )
}
