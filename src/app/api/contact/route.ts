import { deliverContact } from '@/lib/contact'
import { profile } from '@/content/profile'

/** POST /api/contact — relays the form to the validated address. */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ ok: false, error: 'Requête invalide.' }, { status: 400 })
  }
  const endpoint = process.env.CONTACT_FORMSUBMIT_ID ?? profile.email
  const result = await deliverContact(body, endpoint)
  return Response.json(result, { status: result.ok ? 200 : result.status })
}
