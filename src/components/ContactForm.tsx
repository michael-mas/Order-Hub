'use client'

import { useState, type FormEvent } from 'react'

type Status =
  { kind: 'idle' } | { kind: 'sending' } | { kind: 'sent' } | { kind: 'error'; message: string }

const field =
  'w-full rounded-sm border border-border-strong bg-surface px-3 py-2.5 text-text placeholder:text-text-faint focus:border-accent'

/**
 * Three fields, a visible success and a visible failure — never a form that
 * empties itself silently. The address stays in clear text next to it.
 */
export function ContactForm({ email }: { email: string }) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = event.currentTarget
    setStatus({ kind: 'sending' })
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(Object.fromEntries(new FormData(form))),
      })
      const json = (await res.json()) as { ok: boolean; error?: string }
      if (json.ok) {
        form.reset()
        setStatus({ kind: 'sent' })
      } else {
        setStatus({ kind: 'error', message: json.error ?? 'L’envoi a échoué.' })
      }
    } catch {
      setStatus({ kind: 'error', message: 'Connexion impossible.' })
    }
  }

  return (
    <form onSubmit={onSubmit} className="grid max-w-[56ch] gap-4" noValidate={false}>
      <label className="grid gap-1.5">
        <span className="label-mono text-text-faint">Nom</span>
        <input name="name" required maxLength={120} autoComplete="name" className={field} />
      </label>
      <label className="grid gap-1.5">
        <span className="label-mono text-text-faint">E‑mail</span>
        <input
          name="email"
          type="email"
          required
          maxLength={200}
          autoComplete="email"
          className={field}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="label-mono text-text-faint">Message</span>
        <textarea
          name="message"
          required
          minLength={2}
          maxLength={5000}
          rows={5}
          className={field}
        />
      </label>
      {/* Honeypot: hidden from people and assistive tech, filled only by bots. */}
      <input
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="submit"
          disabled={status.kind === 'sending'}
          className="rounded-md bg-accent px-5 py-3 font-medium text-on-accent hover:bg-accent-hover disabled:opacity-60"
        >
          {status.kind === 'sending' ? 'Envoi…' : 'Envoyer'}
        </button>
        <p role="status" aria-live="polite" className="text-sm">
          {status.kind === 'sent' && <span className="text-accent">Message envoyé, merci.</span>}
          {status.kind === 'error' && (
            <span className="text-danger">
              {status.message} Écrivez-moi directement à {email}.
            </span>
          )}
        </p>
      </div>
    </form>
  )
}
