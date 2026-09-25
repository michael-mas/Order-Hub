import { notFound } from 'next/navigation'
import { SceneInspector } from '@/scene/debug/SceneInspector'
import { isDebugView } from '@/scene/debug/views'

export const metadata = { title: 'Scene inspector', robots: { index: false } }

/** Development-only. Served in production builds only when SCENE_DEBUG=1. */
export default async function SceneInspectorPage({
  searchParams,
}: {
  searchParams: Promise<{ layout?: string; view?: string }>
}) {
  if (process.env.NODE_ENV === 'production' && process.env.SCENE_DEBUG !== '1') notFound()
  const { layout = 'hero', view = 'production' } = await searchParams
  if (!isDebugView(view)) notFound()
  return <SceneInspector layoutId={layout} view={view} />
}
