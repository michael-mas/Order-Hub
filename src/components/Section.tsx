import type { ReactNode } from 'react'

interface SectionProps {
  id: string
  index: number
  label: string
  title: string
  /** Scene act this section drives, read by the scene from the DOM. */
  act?: string
  children: ReactNode
}

/** A numbered page section. Server component; the scene reads its attributes. */
export function Section({ id, index, label, title, act, children }: SectionProps) {
  const headingId = `${id}-title`
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      data-scene-act={act}
      className="mx-auto max-w-[1120px] scroll-mt-16 px-[var(--gutter)] py-[var(--section-py)]"
    >
      <div className="reveal">
        <p className="label-mono text-text-faint">
          {String(index).padStart(2, '0')} / {label}
        </p>
        <h2 id={headingId} className="mt-4 text-h2 leading-[1.12] font-bold tracking-[-0.02em]">
          {title}
        </h2>
      </div>
      <div className="mt-8">{children}</div>
    </section>
  )
}
