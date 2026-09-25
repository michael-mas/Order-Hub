/**
 * A visible `⟨À CONFIRMER⟩` / `⟨À RÉDIGER⟩` marker. Missing facts are shown,
 * never filled in. Every marker must be gone before publication; the e2e
 * suite counts them through `data-pending`.
 */
export function Pending({
  kind = 'confirm',
  children,
}: {
  kind?: 'confirm' | 'write'
  children: string
}) {
  const label = kind === 'confirm' ? 'À CONFIRMER' : 'À RÉDIGER'
  return (
    <span
      data-pending={kind}
      className="rounded-sm border border-dashed border-marker px-1.5 py-0.5 font-mono text-[0.8em] text-marker"
    >
      ⟨{label} : {children}⟩
    </span>
  )
}
