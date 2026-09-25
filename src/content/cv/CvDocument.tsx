/**
 * The CV, derived from profile.ts — never written separately, so it cannot
 * contradict the page. Rendered to PDF at build time by a static route.
 */
import {
  Document,
  Font,
  Link,
  Page,
  StyleSheet,
  Text,
  View,
  type DocumentProps,
} from '@react-pdf/renderer'
import type { ReactElement } from 'react'
import { join } from 'node:path'
import { formatMonthYear } from '../format'
import type { Profile } from '../profile'

const fonts = join(process.cwd(), 'assets/fonts')
Font.register({
  family: 'Inter',
  fonts: [
    { src: join(fonts, 'inter-latin-400-normal.woff'), fontWeight: 400 },
    { src: join(fonts, 'inter-latin-600-normal.woff'), fontWeight: 600 },
    { src: join(fonts, 'inter-latin-800-normal.woff'), fontWeight: 800 },
  ],
})
Font.registerHyphenationCallback((word) => [word])

const ACCENT = '#0E7F55'
const MUTED = '#4A5561'

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Inter', fontSize: 9.5, lineHeight: 1.45, color: '#0E1116' },
  name: { fontSize: 24, fontWeight: 800, letterSpacing: -0.5, lineHeight: 1.15 },
  headline: { fontSize: 11, marginTop: 2 },
  contact: { marginTop: 6, color: MUTED, fontSize: 9 },
  section: { marginTop: 16 },
  label: { fontSize: 8, fontWeight: 600, letterSpacing: 1.4, color: ACCENT, marginBottom: 6 },
  row: { flexDirection: 'row', marginBottom: 4 },
  period: { width: 110, color: MUTED },
  skill: { width: 150, paddingRight: 10, fontWeight: 600 },
  grow: { flex: 1 },
  strong: { fontWeight: 600 },
  muted: { color: MUTED },
  item: { marginBottom: 6 },
})

/** The PDF subset of Inter has no U+2011 (non-breaking hyphen): use a plain hyphen. */
function forPdf(profile: Profile): Profile {
  return JSON.parse(JSON.stringify(profile).replaceAll('\u2011', '-')) as Profile
}

export function CvDocument({ profile: source }: { profile: Profile }): ReactElement<DocumentProps> {
  const profile = forPdf(source)
  const positions = profile.positions.map((p) => ({
    period: `${formatMonthYear(p.start)} – ${p.end ? formatMonthYear(p.end) : "aujourd'hui"}`,
    label: `${p.title} · ${p.company}`,
  }))
  return (
    <Document title={`${profile.name} — CV`} author={profile.name} language="fr">
      <Page size="A4" style={styles.page}>
        <Text style={styles.name}>{profile.name}</Text>
        <Text style={styles.headline}>{profile.headline}</Text>
        <Text style={styles.contact}>
          {profile.location} · {profile.status} · {profile.email} ·{' '}
          <Link src={profile.links.linkedin}>LinkedIn</Link> ·{' '}
          <Link src={profile.links.github}>GitHub</Link>
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>PROFIL</Text>
          <Text>{profile.tagline}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>EXPÉRIENCE</Text>
          {positions.map((p) => (
            <View key={p.label} style={styles.row}>
              <Text style={styles.period}>{p.period}</Text>
              <Text style={[styles.grow, styles.strong]}>{p.label}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>RÉALISATIONS</Text>
          {profile.cases.map((c) => (
            <View key={c.id} style={styles.item}>
              <Text style={styles.strong}>{c.title}</Text>
              {c.result && <Text style={styles.muted}>{c.result}</Text>}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>COMPÉTENCES</Text>
          {profile.skills.map((s) => (
            <View key={s.name} style={styles.row}>
              <Text style={styles.skill}>{s.name}</Text>
              <Text style={[styles.grow, styles.muted]}>{s.usage}</Text>
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>PARCOURS ET FORMATION</Text>
          {profile.earlierPath.map((p) => (
            <View key={p.label} style={styles.row}>
              <Text style={styles.period}>{p.period}</Text>
              <Text style={styles.grow}>{p.label}</Text>
            </View>
          ))}
          <Text style={[styles.muted, { marginTop: 2 }]}>{profile.education.join(' · ')}</Text>
        </View>
      </Page>
    </Document>
  )
}
