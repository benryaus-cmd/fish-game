import type { ReactNode } from 'react';
import { getStage, appraiseFish, type Specimen } from '@/utils/boutique';
import { careSummary, careColourQuality } from '@/utils/specimenCare';
import { specimenFormLabel, specimenFinStyle, specimenPattern } from '@/utils/stockCatalog';

export const developmentPaths = [
  { trait: 'ornate', name: 'Ornate', icon: '✧', benefit: 'Flowing fins and a higher show value.', next: 'Each tier develops fuller fins and adds a beauty premium.' },
  { trait: 'swift', name: 'Swift', icon: '↗', benefit: 'Stronger swimming and quicker escapes.', next: 'Each tier adds 12% swim speed, with a higher burst cost.' },
  { trait: 'vibrancy', name: 'Vibrancy', icon: '◈', benefit: 'Richer living colour and a brighter sheen.', next: 'Each choice deepens acquired colour quality without changing inherited hue.' },
  { trait: 'vital', name: 'Vital', icon: '♡', benefit: 'Better food efficiency and recovery.', next: 'A healthier raising path and more reliable breeding condition.' },
] as const;

export function formatCareTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60)}:${String(value % 60).padStart(2, '0')}`;
}

export default function FishCarePanel({ specimen, phase, primaryAction }: { primaryAction?: ReactNode; specimen: Specimen; phase?: 'day' | 'night'; compact?: boolean }) {
  const care = careSummary(specimen, Date.now());
  const stage = getStage(specimen.growth);
  return <section className="fish-care" aria-label="Fish care and progression">
    <p className="care-identity">{stage} {specimen.species} · {specimenFormLabel(specimen)} · ◈ {appraiseFish(specimen)}</p>
    {primaryAction && <div className="care-primary-action">{primaryAction}</div>}
    <p className="home-note">Inherited {specimenFinStyle(specimen)} fins · {specimen.inherited?.finForm ?? 'original'} tail · {specimenPattern(specimen)} pattern</p>
    <dl className="home-stats care-stats">
      <div><dt>Growth</dt><dd>{Math.round(specimen.growth)}%</dd></div>
      <div><dt>Health</dt><dd>{Math.round(specimen.health)}%</dd></div>
      <div><dt>Fed</dt><dd>{Math.round(specimen.hunger)}%</dd></div>
    </dl>
    <div className="care-readiness">
      <span className="home-eyebrow">HEALTHY RAISING</span>
      <strong>{stage === 'adult' ? 'Ready to flourish' : care.adultReadyInSeconds > 0 ? `Adult in at least ${formatCareTime(care.adultReadyInSeconds)}` : 'Time met · keep feeding to mature'}</strong>
      <p>Adulthood starts at ten healthy minutes plus nourishment. Good meals can shorten healthy raising time to a minimum of 7.5 minutes. Poor feeding pauses growth; overfeeding harms health.</p>
    </div>
    <div className="care-vibrancy"><span className="home-eyebrow">LIVING COLOUR</span><strong>{Math.round(careColourQuality(specimen)*100)}% vibrancy</strong><p>Growth reveals your inherited colour. Healthy care deepens its sheen; poor condition dulls it, and recovery brings it back.</p></div>
    <div className="care-diet"><strong>Flakes · pellets · algae{specimen.growth >= 35 ? ' · edible shrimp' : ''}</strong><p>{specimen.growth < 35 ? 'Small fish eat flakes, pellets and algae. Edible shrimp unlock at juvenile growth.' : 'Edible shrimp must still fit your mouth. Other fish are never food. Each shrimp caught while swimming earns ◈ 1.'}</p>
      <p>{care.feedingPreference === 'any' ? 'Feeds equally well by day or night.' : `Prefers ${care.feedingPreference} feeding${phase === care.feedingPreference ? ' · bonus active' : ''}.`}</p>
    </div>
    <div className="care-paths" aria-label="Development paths">{developmentPaths.map(path => {
      const tiers = specimen.traits.filter(trait => trait === path.trait).length;
      return <article key={path.trait} className={tiers ? 'care-path acquired' : 'care-path'}>
        <div><span aria-hidden="true">{path.icon}</span><h3>{path.name}</h3><span className="care-tier">{tiers} chosen</span></div>
        <p>{path.benefit}</p><small>{tiers ? `${tiers} ${tiers === 1 ? 'tier chosen' : 'tiers chosen'}. ` : ''}{path.next}</small>
      </article>;
    })}</div>
    <p className="home-note care-lineage">Upgrade choices accumulate at growth milestones. Choose several paths or deepen one; saved opportunities stay available until chosen. Inherited colour and fin potential stay separate from these choices.{!!specimen.inherited?.parents.length && ' This fish has a recorded two-parent lineage.'}</p>
  </section>;
}
