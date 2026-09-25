import { profile } from '@/content/profile'

export default function HomePage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-24">
      <h1 className="text-5xl font-bold tracking-tight">{profile.name}</h1>
      <p className="mt-4 text-lg">{profile.headline}</p>
      <p className="mt-2 text-sm opacity-80">
        {profile.location} · {profile.status}
      </p>
    </main>
  )
}
