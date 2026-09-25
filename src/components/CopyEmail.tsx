'use client'

import { useState } from 'react'

/** The address stays in clear text; the button only saves a gesture. */
export function CopyEmail({ email }: { email: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(email)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          setCopied(false)
        }
      }}
      className="label-mono rounded-md border border-border-strong px-3 py-2 text-text-muted hover:text-text"
    >
      <span aria-live="polite">{copied ? 'Copié' : 'Copier'}</span>
    </button>
  )
}
