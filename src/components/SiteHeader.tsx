import { ThemeToggle } from './ThemeToggle'

const LINKS = [
  { href: '#travail', label: 'Travail' },
  { href: '#competences', label: 'Compétences' },
  { href: '#parcours', label: 'Parcours' },
]

export function SiteHeader({ name }: { name: string }) {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-[color-mix(in_srgb,var(--bg)_85%,transparent)] backdrop-blur-md">
      <nav
        aria-label="Navigation principale"
        className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-[var(--gutter)]"
      >
        <a href="#top" className="label-mono mr-auto text-text no-underline">
          {name}
        </a>
        <ul className="hidden items-center gap-6 text-sm text-text-muted md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="no-underline hover:text-text">
                {link.label}
              </a>
            </li>
          ))}
        </ul>
        <ThemeToggle />
        <a
          href="#contact"
          className="rounded-md bg-accent px-3 py-2 text-sm font-medium text-on-accent no-underline hover:bg-accent-hover"
        >
          Me contacter
        </a>
      </nav>
    </header>
  )
}
