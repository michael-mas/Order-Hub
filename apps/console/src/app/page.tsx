import { connection } from 'next/server'
import { ControlRoom } from '@/components/ControlRoom'

export default async function Page() {
  // Rendered per request: every response carries its own CSP nonce.
  await connection()
  return <ControlRoom publicDemo={process.env.PUBLIC_DEMO === '1'} />
}
