/**
 * Contact form: validation and delivery through FormSubmit (the relay the
 * previous site already used). Pure and injectable, so it is tested without
 * the network. The endpoint id comes from CONTACT_FORMSUBMIT_ID — the
 * validated address by default, or the random alias FormSubmit issues once
 * the address is activated, which keeps it out of any URL.
 */
import { z } from 'zod'

export const contactSchema = z.object({
  name: z.string().trim().min(1, 'Indiquez votre nom.').max(120),
  email: z.email('Adresse e‑mail invalide.').max(200),
  message: z.string().trim().min(2, 'Le message est vide.').max(5000),
  /** Honeypot: humans never see or fill it. */
  company: z.string().max(0).optional(),
})

export type ContactInput = z.infer<typeof contactSchema>

export type ContactResult =
  | { ok: true }
  | { ok: false; status: 400; error: string }
  | { ok: false; status: 502; error: string }

type Fetch = (url: string, init: RequestInit) => Promise<Response>

export async function deliverContact(
  body: unknown,
  endpointId: string,
  fetchImpl: Fetch = fetch,
): Promise<ContactResult> {
  const parsed = contactSchema.safeParse(body)
  if (!parsed.success) {
    return { ok: false, status: 400, error: parsed.error.issues[0]?.message ?? 'Requête invalide.' }
  }
  const { name, email, message } = parsed.data
  try {
    const res = await fetchImpl(`https://formsubmit.co/ajax/${encodeURIComponent(endpointId)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name,
        email,
        message,
        _subject: `[Portfolio] Message de ${name}`,
        _replyto: email,
        _template: 'table',
        _captcha: 'false',
      }),
      signal: AbortSignal.timeout(8000),
    })
    if (!res.ok) return { ok: false, status: 502, error: `Le relais a répondu ${res.status}.` }
    const json = (await res.json()) as { success?: boolean | string; message?: string }
    if (json.success === false || json.success === 'false') {
      return { ok: false, status: 502, error: json.message ?? 'Le relais a refusé le message.' }
    }
    return { ok: true }
  } catch {
    return { ok: false, status: 502, error: 'Le relais est injoignable.' }
  }
}
